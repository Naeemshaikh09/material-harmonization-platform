"""
Review Workbench Router
Developer 1: Backend Core
Manages steward review queue (L1/L2) and review decisions (APPROVE/REJECT/CORRECT/NEW).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from ..db.database import get_db
from ..db.models import ReviewTask, ReviewDecision, RawRecord, CMC, Crosswalk
from ..codes.cmc_service import CMCService

router = APIRouter()
cmc_service = CMCService()


class DecisionSubmission(BaseModel):
    action: str  # APPROVE, REJECT, CORRECT, NEW
    reviewer_id: int = 1
    corrections: Optional[Dict[str, Any]] = None
    note: Optional[str] = None


@router.get("/queue")
def list_review_queue(status: str = "OPEN", level: str = "L1", db: Session = Depends(get_db)):
    tasks = db.query(ReviewTask).filter(ReviewTask.status == status, ReviewTask.level == level).all()
    res = []
    for t in tasks:
        raw = db.query(RawRecord).filter(RawRecord.id == t.raw_id).first()
        cand = db.query(CMC).filter(CMC.id == t.candidate_cmc).first() if t.candidate_cmc else None
        res.append({
            "task_id": t.id,
            "raw_id": t.raw_id,
            "cpse_code": raw.cpse_code if raw else "",
            "description": raw.description if raw else "",
            "reason": t.reason,
            "priority": t.priority,
            "comparison": t.comparison,
            "candidate_code": cand.code if cand else None,
            "status": t.status,
            "created_at": t.created_at
        })
    return res


@router.post("/{task_id}/decision")
def submit_decision(task_id: int, sub: DecisionSubmission, db: Session = Depends(get_db)):
    task = db.query(ReviewTask).filter(ReviewTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Review task not found")

    decision = ReviewDecision(
        task_id=task.id,
        reviewer_id=sub.reviewer_id,
        action=sub.action,
        corrections=sub.corrections,
        note=sub.note
    )
    db.add(decision)

    raw = db.query(RawRecord).filter(RawRecord.id == task.raw_id).first()

    if sub.action == "APPROVE" and task.candidate_cmc:
        cw = Crosswalk(
            cpse_id=raw.cpse_id if raw else 1,
            cpse_code=raw.cpse_code if raw else "UNKNOWN",
            cmc_id=task.candidate_cmc,
            raw_id=task.raw_id,
            relationship="EXACT",
            decision_source="HUMAN"
        )
        db.add(cw)
    elif sub.action == "NEW":
        attrs = sub.corrections or {}
        new_code = cmc_service.generate_code("0112", "0003", "0050", "0017", "0150", task_id + 900)
        s_desc, l_desc = cmc_service.generate_descriptions("VALVE", attrs)
        new_cmc = CMC(
            code=new_code,
            class_code="0112",
            subclass_code="0003",
            canonical_key=f"0112|0003|{task_id}",
            attributes=attrs,
            description_short=s_desc,
            description_long=l_desc
        )
        db.add(new_cmc)
        db.commit()
        db.refresh(new_cmc)

        cw = Crosswalk(
            cpse_id=raw.cpse_id if raw else 1,
            cpse_code=raw.cpse_code if raw else "UNKNOWN",
            cmc_id=new_cmc.id,
            raw_id=task.raw_id,
            relationship="EXACT",
            decision_source="HUMAN"
        )
        db.add(cw)

    task.status = "DONE"
    db.commit()
    return {"status": "SUCCESS", "task_id": task_id, "action": sub.action}
