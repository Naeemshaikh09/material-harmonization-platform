"""
Pydantic schemas for the extraction service API.
Matches contracts/extract_contract.json exactly.

IMPORTANT: state is always KNOWN or UNKNOWN.
NA is never returned by this service — the canonicalizer applies it from the template.
"""

from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, field_validator


class AttributeResult(BaseModel):
    value: Optional[str] = None
    unit: Optional[str] = None
    state: str  # "KNOWN" or "UNKNOWN" only
    confidence: float
    source_span: Optional[str] = None

    @field_validator("state")
    @classmethod
    def state_must_be_known_or_unknown(cls, v: str) -> str:
        if v not in ("KNOWN", "UNKNOWN"):
            raise ValueError(
                f"state must be KNOWN or UNKNOWN, got '{v}'. "
                "NA is applied by the canonicalizer, never by the extraction service."
            )
        return v


class ExtractionRequest(BaseModel):
    text: str
    cpse_id: Optional[int] = None
    class_hint: Optional[str] = None


class ExtractionResponse(BaseModel):
    class_code: Optional[str] = None
    subclass_code: Optional[str] = None
    class_confidence: float = 0.0
    attributes: dict[str, AttributeResult]
    model_version: str


class BatchExtractionRequest(BaseModel):
    items: List[ExtractionRequest]


class BatchExtractionResponse(BaseModel):
    results: List[ExtractionResponse]
