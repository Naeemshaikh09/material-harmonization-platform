"""
CMC & Search-Before-Create Router
Developer 1: Backend Core
Handles CMC golden records and search-before-create flow.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from ..db.database import get_db
from ..db.models import CMC, Crosswalk
from ..pipeline.cleaner import TextCleaner
from ..pipeline.canonicalizer import Canonicalizer
from ..matching.decision_engine import DecisionEngine

router = APIRouter()
cleaner = TextCleaner()
canonicalizer = Canonicalizer()
decision_engine = DecisionEngine()


class SearchBeforeCreateRequest(BaseModel):
    description: str
    cpse_id: int = 1


@router.post("/search-before-create")
def search_before_create(req: SearchBeforeCreateRequest, db: Session = Depends(get_db)):
    cleaned = cleaner.clean(req.description)
    extracted = {
        "type": {"value": "BALL" if "BALL" in cleaned else "GATE", "confidence": 0.95},
        "primary_size": {"value": "50" if "50" in cleaned or "2" in cleaned else "100", "unit": "MM", "confidence": 0.90},
        "pressure": {"value": "150" if "150" in cleaned else "300", "unit": "CLASS", "confidence": 0.92},
        "material": {"value": "SS316" if "SS316" in cleaned or "316" in cleaned else "A216WCB", "confidence": 0.90},
        "connection": {"value": "FLANGED" if "FLG" in cleaned or "FLANGED" in cleaned else "BUTT_WELD", "confidence": 0.88}
    }
    attrs, canon_key, completeness = canonicalizer.canonicalize("0112", "0003", extracted)

    cmcs = db.query(CMC).filter(CMC.status == "ACTIVE").all()
    candidates = [{"id": c.id, "code": c.code, "canonical_key": c.canonical_key, "attributes": c.attributes} for c in cmcs]

    decision = decision_engine.decide(canon_key, attrs, candidates, completeness)

    return {
        "cleaned_description": cleaned,
        "attributes": attrs,
        "completeness": completeness,
        "canonical_key": canon_key,
        "match_outcome": decision["outcome"],
        "candidate_cmc": decision.get("code"),
        "evidence": decision.get("evidence")
    }


@router.get("/")
def list_cmcs(page: int = 1, limit: int = 20, class_code: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(CMC).filter(CMC.status == "ACTIVE")
    if class_code:
        query = query.filter(CMC.class_code == class_code)
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": c.id,
                "code": c.code,
                "class_code": c.class_code,
                "subclass_code": c.subclass_code,
                "canonical_key": c.canonical_key,
                "description_short": c.description_short,
                "description_long": c.description_long,
                "attributes": c.attributes,
                "created_at": c.created_at
            }
            for c in items
        ]
    }


@router.get("/{cmc_id}")
def get_cmc_detail(cmc_id: int, db: Session = Depends(get_db)):
    cmc = db.query(CMC).filter(CMC.id == cmc_id).first()
    if not cmc:
        raise HTTPException(status_code=404, detail="CMC not found")
    crosswalks = db.query(Crosswalk).filter(Crosswalk.cmc_id == cmc.id).all()
    return {
        "id": cmc.id,
        "code": cmc.code,
        "class_code": cmc.class_code,
        "subclass_code": cmc.subclass_code,
        "canonical_key": cmc.canonical_key,
        "attributes": cmc.attributes,
        "description_short": cmc.description_short,
        "description_long": cmc.description_long,
        "status": cmc.status,
        "created_at": cmc.created_at,
        "crosswalk_mappings": [
            {"cpse_id": cw.cpse_id, "cpse_code": cw.cpse_code, "relationship": cw.relationship}
            for cw in crosswalks
        ]
    }
