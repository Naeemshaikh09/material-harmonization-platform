"""
Canonicalizer & Attribute Normalizer Module
Developer 1: Backend Core
Applies template rules to extracted attributes, builds canonical key, checks completeness.
"""

import json
import os
import glob
from typing import Dict, Any, Tuple

TEMPLATES_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "templates")
)


class Canonicalizer:
    def __init__(self, templates_dir=TEMPLATES_DIR):
        self.templates = {}
        self.load_templates(templates_dir)

    def load_templates(self, path):
        if not os.path.exists(path):
            return
        files = glob.glob(os.path.join(path, "*.json"))
        for f in files:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                code = data.get("class_code")
                if code:
                    self.templates[code] = data

    def canonicalize(self, class_code: str, subclass_code: str, raw_attributes: Dict[str, Any]) -> Tuple[Dict[str, Any], str, str]:
        """
        Validates attributes against template.
        Sets KNOWN/UNKNOWN/NA.
        Generates canonical key (critical dims in fixed order).
        Returns (attributes, canonical_key, completeness).
        """
        template = self.templates.get(class_code, {})
        dims = template.get("dimensions", {})
        processed_attrs = {}
        critical_complete = True
        key_parts = [class_code or "0000", subclass_code or "0000"]

        # 20 fixed dimension keys
        fixed_keys = [
            "type", "primary_size", "length", "thickness", "material", "secondary_material",
            "pressure", "temperature", "flow", "electrical", "mechanical_loading",
            "stiffness_hardness", "connection", "actuation", "standard", "protection",
            "measurement", "coating", "manufacturer_part", "uom"
        ]

        for key in fixed_keys:
            dim_spec = dims.get(key, {})
            is_applicable = dim_spec.get("applicable", True)
            is_critical = dim_spec.get("critical", False)
            extracted = raw_attributes.get(key, {})

            val = extracted.get("value")
            unit = extracted.get("unit")
            conf = extracted.get("confidence", 0.0)
            span = extracted.get("source_span")

            if not is_applicable:
                state = "NA"
                val = None
            elif val is not None and str(val).strip() != "":
                state = "KNOWN"
            else:
                state = "UNKNOWN"
                val = None

            processed_attrs[key] = {
                "value": val,
                "unit": unit,
                "state": state,
                "confidence": conf if state == "KNOWN" else 0.0,
                "source_span": span
            }

            if is_critical and is_applicable:
                if state == "KNOWN":
                    key_parts.append(str(val))
                else:
                    critical_complete = False

        completeness = "COMPLETE" if critical_complete else "INCOMPLETE"
        canonical_key = "|".join(key_parts) if critical_complete else None

        return processed_attrs, canonical_key, completeness
