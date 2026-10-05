"""
Audit Router
Developer 1: Backend Core
Provides SHA-256 tamper-evident audit logs, chain verification, and external hash anchoring.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..db.database import get_db
from ..db.models import AuditLog, AuditAnchor
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from data.audit.verify_audit import verify_hash_chain, compute_row_hash
from data.audit.anchor_audit import anchor_hash

router = APIRouter()


@router.get("/")
def get_audit_logs(
    entity: Optional[str] = None,
    entity_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if entity_id:
        query = query.filter(AuditLog.entity_id == str(entity_id))

    total = query.count()
    items = query.order_by(AuditLog.id.asc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": log.id,
                "ts": log.ts,
                "actor": log.actor,
                "action": log.action,
                "entity": log.entity,
                "entity_id": log.entity_id,
                "before": log.before,
                "after": log.after,
                "prev_hash": log.prev_hash,
                "hash": log.hash
            }
            for log in items
        ]
    }


@router.post("/verify")
def verify_audit_chain(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    log_dicts = [
        {
            "id": l.id,
            "ts": str(l.ts),
            "actor": l.actor,
            "action": l.action,
            "entity": l.entity,
            "entity_id": str(l.entity_id),
            "before": l.before,
            "after": l.after,
            "evidence": l.evidence,
            "prev_hash": l.prev_hash,
            "hash": l.hash
        }
        for l in logs
    ]

    res = verify_hash_chain(log_dicts)
    return res


@router.post("/anchor")
def anchor_latest_audit_hash(db: Session = Depends(get_db)):
    latest = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    if not latest:
        return {"anchored": False, "reason": "No audit entries found"}

    anchored_record = anchor_hash(latest.id, latest.hash)

    anchor_db = AuditAnchor(
        audit_id=latest.id,
        hash=latest.hash,
        location="local_fs"
    )
    db.add(anchor_db)
    db.commit()

    return {"anchored": True, "record": anchored_record}
