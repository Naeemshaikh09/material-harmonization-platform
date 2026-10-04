"""
Extraction service — FastAPI application.
Developer2's deliverable for the extraction API contract.

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
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Material Extraction Service",
    description=(
        "Extracts structured attributes from industrial material descriptions. "
        "Returns KNOWN or UNKNOWN per attribute. NA is applied by the canonicalizer."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Core extraction logic
# ---------------------------------------------------------------------------

def _run_extraction(req: ExtractionRequest) -> ExtractionResponse:
    """
    Hybrid extraction pipeline:
      1. Rules extractor (always runs)
      2. SLM (runs if model is loaded)
      3. Merge (rules priority, model fills gaps)
      4. Post-process (validate, apply confidence threshold)
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty")

    # --- Step 1: Rules ---
    rules_result = extract_with_rules(text, class_hint=req.class_hint)
    rules_attrs: dict[str, AttributeResult] = rules_result["attributes"]

    class_code = rules_result["class_code"]
    subclass_code = rules_result["subclass_code"]
    class_confidence = rules_result["class_confidence"]

    # --- Step 2: SLM (if available) ---
    model_attrs: dict[str, AttributeResult] = {}
    if is_model_available():
        model_attrs = extract_with_model(text, class_hint=req.class_hint or class_code)

    # --- Step 3: Merge ---
    if model_attrs:
        merged_attrs = merge_rules_and_model(rules_attrs, model_attrs)
        model_version = f"{RULES_VERSION}+{SLM_VERSION}"
    else:
        merged_attrs = rules_attrs
        model_version = RULES_VERSION

    # --- Step 4: Post-process ---
    final_attrs = postprocess(merged_attrs, class_code=class_code)

    # Ensure all 20 dimensions are present
    for dim in ALL_DIMENSIONS:
        if dim not in final_attrs:
            final_attrs[dim] = AttributeResult(
                value=None, unit=None, state="UNKNOWN", confidence=0.0, source_span=None
            )

    return ExtractionResponse(
        class_code=class_code,
        subclass_code=subclass_code,
        class_confidence=class_confidence,
        attributes=final_attrs,
        model_version=model_version,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/extract", response_model=ExtractionResponse)
def extract_single(req: ExtractionRequest) -> ExtractionResponse:
    """
    Extract attributes from a single item description.
    Called by developer1's pipeline canonicalizer.
    """
    return _run_extraction(req)


@app.post("/extract/batch", response_model=BatchExtractionResponse)
def extract_batch(req: BatchExtractionRequest) -> BatchExtractionResponse:
    """
    Bulk extraction for ingest jobs.
    Items are processed sequentially (add async workers if throughput is needed).
    """
    if not req.items:
        raise HTTPException(status_code=400, detail="items list must not be empty")
    if len(req.items) > 1000:
        raise HTTPException(status_code=400, detail="batch size limit is 1000 items")

    results: List[ExtractionResponse] = []
    for item in req.items:
        try:
            results.append(_run_extraction(item))
        except HTTPException:
            # Return UNKNOWN result for this item rather than failing the whole batch
            empty_attrs = {
                dim: AttributeResult(
                    value=None, unit=None, state="UNKNOWN", confidence=0.0, source_span=None
                )
                for dim in ALL_DIMENSIONS
            }
            results.append(
                ExtractionResponse(
                    class_code=None,
                    subclass_code=None,
                    class_confidence=0.0,
                    attributes=empty_attrs,
                    model_version=RULES_VERSION,
                )
            )

    return BatchExtractionResponse(results=results)


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
