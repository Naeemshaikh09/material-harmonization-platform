"""
Extraction service — FastAPI application.
Developer 2's deliverable for the extraction API contract.

Endpoints:
  POST /extract        — single item (used by developer1's pipeline)
  POST /extract/batch  — bulk items (used during ingest jobs)
  GET  /health         — liveness check
  GET  /version        — service and model versions
  POST /reload-dict    — reload terminology dictionary (admin use)

State: KNOWN or UNKNOWN only. NA is never returned.
"""

from __future__ import annotations
import logging
import os
import sys
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

file_dir = Path(__file__).resolve().parent
sys.path.append(str(file_dir))
sys.path.append(str(file_dir.parent.parent))

try:
    from .schemas import (
        ExtractionRequest,
        ExtractionResponse,
        AttributeResult,
        BatchExtractionRequest,
        BatchExtractionResponse,
    )
    from .extractor import extract_with_rules, RULES_VERSION, ALL_DIMENSIONS
    from .model import extract_with_model, is_model_available, SLM_VERSION
    from .postprocess import postprocess, merge_rules_and_model
    from .dictionary import get_dictionary, reload_dictionary
except ImportError:
    from schemas import (
        ExtractionRequest,
        ExtractionResponse,
        AttributeResult,
        BatchExtractionRequest,
        BatchExtractionResponse,
    )
    from extractor import extract_with_rules, RULES_VERSION, ALL_DIMENSIONS
    from model import extract_with_model, is_model_available, SLM_VERSION
    from postprocess import postprocess, merge_rules_and_model
    from dictionary import get_dictionary, reload_dictionary

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Material Extraction Service",
    description=(
        "Standardized attribute extraction from unstructured CPSE item descriptions. "
        "SIH 26099 deliverable."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/extract", response_model=ExtractionResponse)
def extract_single(req: ExtractionRequest) -> ExtractionResponse:
    """Extract attributes from a single material description."""
    rule_res = extract_with_rules(req.text, req.class_hint)
    rule_attrs = rule_res.get("attributes", {})
    class_code = rule_res.get("class_code")
    subclass_code = rule_res.get("subclass_code")
    class_confidence = rule_res.get("class_confidence", 0.0)

    model_res = (
        extract_with_model(req.text, req.class_hint)
        if is_model_available()
        else None
    )
    model_attrs = model_res.get("attributes") if model_res else None

    merged_attrs = (
        merge_rules_and_model(rule_attrs, model_attrs)
        if model_attrs
        else rule_attrs
    )
    final_attrs = postprocess(merged_attrs, class_code)

    version_str = (
        f"{RULES_VERSION}+{SLM_VERSION}"
        if is_model_available()
        else RULES_VERSION
    )

    return ExtractionResponse(
        class_code=class_code,
        subclass_code=subclass_code,
        class_confidence=class_confidence,
        attributes=final_attrs,
        model_version=version_str,
    )


@app.post("/extract/batch", response_model=BatchExtractionResponse)
def extract_batch(req: BatchExtractionRequest) -> BatchExtractionResponse:
    """Extract attributes from a batch of items (up to 500 per call)."""
    if len(req.items) > 500:
        raise HTTPException(
            status_code=400,
            detail="Batch limit exceeded. Maximum 500 items per call.",
        )

    results = [extract_single(item) for item in req.items]

    version_str = (
        f"{RULES_VERSION}+{SLM_VERSION}"
        if is_model_available()
        else RULES_VERSION
    )

    return BatchExtractionResponse(results=results, model_version=version_str)


@app.get("/health")
def health() -> dict:
    """Liveness check."""
    return {
        "status": "ok",
        "model_loaded": is_model_available(),
        "model_version": f"{RULES_VERSION}+{SLM_VERSION}" if is_model_available() else RULES_VERSION,
        "dictionary_version": get_dictionary().version,
    }


@app.get("/version")
def version() -> dict:
    """Service version information."""
    return {
        "rules_version": RULES_VERSION,
        "slm_version": SLM_VERSION if is_model_available() else None,
        "model_type": os.environ.get("MODEL_TYPE", "seq2seq") if is_model_available() else None,
        "dictionary_version": get_dictionary().version,
        "combined_version": (
            f"{RULES_VERSION}+{SLM_VERSION}" if is_model_available() else RULES_VERSION
        ),
    }


@app.post("/reload-dict")
def reload_dict() -> dict:
    """
    Reload the terminology dictionary from disk.
    Call this after developer4 updates terminology.json.
    """
    reload_dictionary()
    return {"status": "reloaded", "version": get_dictionary().version}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml.service.main:app", host="0.0.0.0", port=8001, reload=True)
