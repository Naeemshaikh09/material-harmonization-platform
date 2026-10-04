"""
Post-processing layer.
Runs after rules extractor (and later after the SLM).

Responsibilities:
  1. Validate attribute values against developer4's code tables and templates.
  2. If a value is invalid or confidence is below threshold -> UNKNOWN.
  3. Merge rules output with SLM output (rules take priority, SLM fills gaps).
  4. Ensure state is always KNOWN or UNKNOWN — never NA.

Confidence threshold is configurable via env variable CONFIDENCE_THRESHOLD.
Default: 0.50
"""

from __future__ import annotations
import json
import os
from typing import Dict, Optional

from .schemas import AttributeResult

CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.50"))

# ---------------------------------------------------------------------------
# Template / code table loader
# Developer4 delivers these files. Service runs without them (no validation).
# ---------------------------------------------------------------------------

_templates: Dict = {}
_code_tables: Dict = {}


def _load_templates() -> None:
    template_dir = os.environ.get(
        "TEMPLATES_DIR",
        os.path.join(os.path.dirname(__file__), "../../data/templates"),
    )
    if not os.path.isdir(template_dir):
        return
    for fname in os.listdir(template_dir):
        if fname.endswith(".json"):
            fpath = os.path.join(template_dir, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    tpl = json.load(f)
                class_code = tpl.get("class_code")
                if class_code:
                    _templates[class_code] = tpl
            except Exception:
                pass


def _load_code_tables() -> None:
    ct_dir = os.environ.get(
        "CODE_TABLES_DIR",
        os.path.join(os.path.dirname(__file__), "../../data/code_tables"),
    )
    if not os.path.isdir(ct_dir):
        return
    for fname in os.listdir(ct_dir):
        if fname.endswith(".json"):
            fpath = os.path.join(ct_dir, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    ct = json.load(f)
                table_name = ct.get("name")
                if table_name:
                    _code_tables[table_name] = {
                        entry["canonical"]: entry
                        for entry in ct.get("values", [])
                        if entry.get("status", "ACTIVE") == "ACTIVE"
                    }
            except Exception:
                pass


def _init_reference_data() -> None:
    if not _templates:
        _load_templates()
    if not _code_tables:
        _load_code_tables()


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _is_valid_value(attribute_name: str, value: str, class_code: Optional[str]) -> bool:
    """
    Check if value is in the allowed values for this attribute.
    Returns True if we have no code table for this attribute (can't invalidate).
    """
    if not class_code or class_code not in _templates:
        return True  # no template available — pass through

    template = _templates[class_code]
    dims = template.get("dimensions", {})
    dim_def = dims.get(attribute_name, {})
    code_table_name = dim_def.get("code_table")

    if not code_table_name:
        return True  # no code table for this dimension

    table = _code_tables.get(code_table_name, {})
    if not table:
        return True  # table not loaded yet

    # Check against canonical values
    return value.upper() in {k.upper() for k in table.keys()}


# ---------------------------------------------------------------------------
# Main post-processor
# ---------------------------------------------------------------------------

def postprocess(
    attributes: Dict[str, AttributeResult],
    class_code: Optional[str] = None,
) -> Dict[str, AttributeResult]:
    """
    Validate and clean each attribute.
    - Low confidence -> UNKNOWN
    - Invalid value (not in code table) -> UNKNOWN
    - Ensure state is never NA
    """
    _init_reference_data()

    result: Dict[str, AttributeResult] = {}

    for attr_name, attr in attributes.items():
        # Safety: enforce state constraint
        if attr.state == "NA":
            # This should never come from the extractor — but guard anyway
            attr = AttributeResult(
                value=None,
                unit=None,
                state="UNKNOWN",
                confidence=0.0,
                source_span=None,
            )

        if attr.state == "UNKNOWN":
            result[attr_name] = attr
            continue

        # Check confidence threshold
        if attr.confidence < CONFIDENCE_THRESHOLD:
            result[attr_name] = AttributeResult(
                value=None, unit=None, state="UNKNOWN",
                confidence=attr.confidence, source_span=attr.source_span,
            )
            continue

        # Validate against code table if value is known
        if attr.value and not _is_valid_value(attr_name, attr.value, class_code):
            # Value not in allowed set — mark unknown but keep span for debugging
            result[attr_name] = AttributeResult(
                value=None, unit=None, state="UNKNOWN",
                confidence=0.0, source_span=attr.source_span,
            )
            continue

        result[attr_name] = attr

    return result


def merge_rules_and_model(
    rules_attrs: Dict[str, AttributeResult],
    model_attrs: Dict[str, AttributeResult],
) -> Dict[str, AttributeResult]:
    """
    Hybrid merge: rules take priority.
    Model fills in attributes that rules left UNKNOWN.
    If both are KNOWN, keep the one with higher confidence.
    """
    merged: Dict[str, AttributeResult] = {}

    all_keys = set(rules_attrs) | set(model_attrs)

    for key in all_keys:
        rules_attr = rules_attrs.get(key)
        model_attr = model_attrs.get(key)

        if rules_attr is None:
            merged[key] = model_attr  # type: ignore
        elif model_attr is None:
            merged[key] = rules_attr
        elif rules_attr.state == "KNOWN" and model_attr.state == "UNKNOWN":
            merged[key] = rules_attr
        elif rules_attr.state == "UNKNOWN" and model_attr.state == "KNOWN":
            merged[key] = model_attr
        elif rules_attr.state == "KNOWN" and model_attr.state == "KNOWN":
            # Both known — take higher confidence
            merged[key] = rules_attr if rules_attr.confidence >= model_attr.confidence else model_attr
        else:
            # Both unknown
            merged[key] = rules_attr

    return merged
