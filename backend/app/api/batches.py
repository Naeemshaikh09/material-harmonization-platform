"""
Ingestion & Batch Router
Developer 1: Backend Core
Handles CSV batch ingestion, incremental load check, and processing.
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import hashlib
import csv
import io

from ..db.database import get_db
from ..db.models import IngestBatch, RawRecord, CanonicalRecord, Crosswalk, CMC, ReviewTask
from ..pipeline.cleaner import TextCleaner
from ..pipeline.canonicalizer import Canonicalizer
from ..matching.decision_engine import DecisionEngine
from ..codes.cmc_service import CMCService

router = APIRouter()

cleaner = TextCleaner()
canonicalizer = Canonicalizer()
decision_engine = DecisionEngine()
cmc_service = CMCService()


@router.post("/upload")
async def upload_batch(
    file: UploadFile = File(...),
    cpse_id: int = Form(...),
    mode: str = Form("BULK"),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    text = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    batch = IngestBatch(
        cpse_id=cpse_id,
        filename=file.filename,
        mode=mode,
        status="RUNNING",
        total_rows=0
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    counts = {"linked": 0, "new": 0, "pending": 0, "conflict": 0, "error": 0}
    total = 0

    # Fetch active CMCs for matching
    existing_cmcs = db.query(CMC).filter(CMC.status == "ACTIVE").all()
    candidate_list = [
        {"id": c.id, "code": c.code, "canonical_key": c.canonical_key, "attributes": c.attributes}
        for c in existing_cmcs
    ]

    for row in reader:
        total += 1
        raw_code = row.get("cpse_code", f"ITEM-{total}")
        raw_desc = row.get("description", "")
        uom = row.get("uom", "EA")

        # Row hash for incremental load check
        row_hash = hashlib.sha256(f"{cpse_id}:{raw_code}:{raw_desc}".encode("utf-8")).hexdigest()

        existing_raw = db.query(RawRecord).filter(
            RawRecord.cpse_id == cpse_id,
            RawRecord.cpse_code == raw_code,
            RawRecord.row_hash == row_hash
        ).first()

        if existing_raw:
            continue

        raw_rec = RawRecord(
            batch_id=batch.id,
            cpse_id=cpse_id,
            cpse_code=raw_code,
            description=raw_desc,
            uom=uom,
            row_hash=row_hash
        )
        db.add(raw_rec)
        db.commit()
        db.refresh(raw_rec)

        # 1. Clean
        cleaned_desc = cleaner.clean(raw_desc)

        # 2. Extract heuristic / ML attributes
        # Simplified extraction logic inline for pipeline
        subclass_code = "0003" if "BALL" in cleaned_desc else "0001" if "GATE" in cleaned_desc else "0000"
        extracted_attrs = {
            "type": {"value": "BALL" if "BALL" in cleaned_desc else "GATE", "confidence": 0.95},
            "primary_size": {"value": "50" if "50" in cleaned_desc or "2\"" in cleaned_desc or "2IN" in cleaned_desc else "100", "unit": "MM", "confidence": 0.90},
            "pressure": {"value": "150" if "150" in cleaned_desc else "300", "unit": "CLASS", "confidence": 0.92},
            "material": {"value": "SS316" if "SS316" in cleaned_desc or "STAINLESS" in cleaned_desc else "A216WCB", "confidence": 0.90},
            "connection": {"value": "FLANGED" if "FLG" in cleaned_desc or "FLANGED" in cleaned_desc else "BUTT_WELD", "confidence": 0.88}
        }

        # 3. Canonicalize
        attrs, canon_key, completeness = canonicalizer.canonicalize("0112", subclass_code, extracted_attrs)

        canon_rec = CanonicalRecord(
            raw_id=raw_rec.id,
            class_code="0112",
            subclass_code=subclass_code,
            attributes=attrs,
            canonical_key=canon_key,
            completeness=completeness
        )
        db.add(canon_rec)
        db.commit()

        # 4. Matching & Decision
        decision = decision_engine.decide(canon_key, attrs, candidate_list, completeness)
        outcome = decision["outcome"]

        if outcome == "LINKED":
            counts["linked"] += 1
            cw = Crosswalk(
                cpse_id=cpse_id,
                cpse_code=raw_code,
                cmc_id=decision["cmc_id"],
                raw_id=raw_rec.id,
                relationship="EXACT",
                decision_source="AUTO",
                evidence=decision["evidence"]
            )
            db.add(cw)
        elif outcome == "NEW_CMC":
            counts["new"] += 1
            new_code = cmc_service.generate_code("0112", subclass_code, "0050", "0017", "0150", total)
            s_desc, l_desc = cmc_service.generate_descriptions("VALVE", attrs)
            new_cmc = CMC(
                code=new_code,
                class_code="0112",
                subclass_code=subclass_code,
                canonical_key=canon_key,
                attributes=attrs,
                description_short=s_desc,
                description_long=l_desc
            )
            db.add(new_cmc)
            db.commit()
            db.refresh(new_cmc)

            cw = Crosswalk(
                cpse_id=cpse_id,
                cpse_code=raw_code,
                cmc_id=new_cmc.id,
                raw_id=raw_rec.id,
                relationship="EXACT",
                decision_source="AUTO",
                evidence={"new_cmc": True}
            )
            db.add(cw)
            candidate_list.append({"id": new_cmc.id, "code": new_cmc.code, "canonical_key": canon_key, "attributes": attrs})
        else:
            counts["pending"] += 1
            task = ReviewTask(
                raw_id=raw_rec.id,
                candidate_cmc=decision.get("cmc_id"),
                reason=decision.get("reason", "INCOMPLETE"),
                comparison=decision.get("evidence"),
                status="OPEN"
            )
            db.add(task)

        db.commit()

    batch.total_rows = total
    batch.counts = counts
    batch.status = "DONE"
    db.commit()

    return {"batch_id": batch.id, "status": "DONE", "total_rows": total, "counts": counts}


@router.get("/{batch_id}")
def get_batch_status(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(IngestBatch).filter(IngestBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return {
        "id": batch.id,
        "filename": batch.filename,
        "status": batch.status,
        "total_rows": batch.total_rows,
        "counts": batch.counts,
        "created_at": batch.created_at
    }
