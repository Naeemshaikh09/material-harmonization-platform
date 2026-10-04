"""
Tests for the post-processing layer.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import pytest
from ml.service.schemas import AttributeResult
from ml.service.postprocess import postprocess, merge_rules_and_model


def _known(value: str, confidence: float = 0.9) -> AttributeResult:
    return AttributeResult(
        value=value, unit=None, state="KNOWN",
        confidence=confidence, source_span=value
    )


def _unknown() -> AttributeResult:
    return AttributeResult(
        value=None, unit=None, state="UNKNOWN",
        confidence=0.0, source_span=None
    )


class TestPostprocess:
    def test_low_confidence_becomes_unknown(self):
        attrs = {"type": _known("BALL", confidence=0.3)}
        result = postprocess(attrs)
        assert result["type"].state == "UNKNOWN"

    def test_high_confidence_passes_through(self):
        attrs = {"type": _known("BALL", confidence=0.9)}
        result = postprocess(attrs)
        assert result["type"].state == "KNOWN"
        assert result["type"].value == "BALL"

    def test_na_state_becomes_unknown(self):
        """NA must never come from extractor — guard in postprocess too."""
        # Manually create an AttributeResult with state=NA (bypass validator)
        attr = AttributeResult.model_construct(
            value=None, unit=None, state="NA", confidence=0.0, source_span=None
        )
        attrs = {"type": attr}
        result = postprocess(attrs)
        assert result["type"].state == "UNKNOWN"

    def test_unknown_passes_through(self):
        attrs = {"type": _unknown()}
        result = postprocess(attrs)
        assert result["type"].state == "UNKNOWN"


class TestMerge:
    def test_rules_known_model_unknown_takes_rules(self):
        rules = {"type": _known("BALL", 0.98)}
        model = {"type": _unknown()}
        merged = merge_rules_and_model(rules, model)
        assert merged["type"].state == "KNOWN"
        assert merged["type"].value == "BALL"

    def test_rules_unknown_model_known_takes_model(self):
        rules = {"pressure": _unknown()}
        model = {"pressure": _known("150", 0.85)}
        merged = merge_rules_and_model(rules, model)
        assert merged["pressure"].state == "KNOWN"
        assert merged["pressure"].value == "150"

    def test_both_known_takes_higher_confidence(self):
        rules = {"material": _known("SS316", confidence=0.95)}
        model = {"material": _known("SS316L", confidence=0.99)}
        merged = merge_rules_and_model(rules, model)
        assert merged["material"].confidence == 0.99
        assert merged["material"].value == "SS316L"

    def test_rules_priority_equal_confidence(self):
        rules = {"connection": _known("FLANGED", confidence=0.90)}
        model = {"connection": _known("FLANGED", confidence=0.90)}
        merged = merge_rules_and_model(rules, model)
        # Equal confidence — rules win
        assert merged["connection"].value == "FLANGED"

    def test_model_only_attribute_included(self):
        rules = {}
        model = {"actuation": _known("MOTOR_OPERATED", 0.88)}
        merged = merge_rules_and_model(rules, model)
        assert "actuation" in merged
        assert merged["actuation"].state == "KNOWN"
