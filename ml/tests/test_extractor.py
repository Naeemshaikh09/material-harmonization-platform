"""
Tests for the rules-based extractor — developer2.

Run with: pytest ml/tests/
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

import pytest
from ml.service.extractor import (
    detect_class,
    extract_valve_type,
    extract_primary_size,
    extract_pressure,
    extract_material,
    extract_connection,
    extract_actuation,
    extract_standard,
    extract_temperature,
    extract_with_rules,
)
from ml.service.dictionary import TerminologyDictionary
from ml.service.schemas import AttributeResult


# ---------------------------------------------------------------------------
# Class detection
# ---------------------------------------------------------------------------

class TestClassDetection:
    def test_ball_valve(self):
        cc, cn, sc, sn, conf = detect_class("BALL VLV 2IN CL150 SS316 FLG")
        assert cc == "0112"
        assert sc == "0003"
        assert conf >= 0.95

    def test_gate_valve(self):
        cc, cn, sc, sn, conf = detect_class("GATE VALVE DN100 300# WCB BW")
        assert cc == "0112"
        assert sc == "0001"

    def test_butterfly_valve(self):
        cc, cn, sc, sn, conf = detect_class("BUTTERFLY VALVE DN200 PN16 CI")
        assert cc == "0112"
        assert sc == "0007"

    def test_pipe(self):
        cc, cn, sc, sn, conf = detect_class("PIPE 2IN SCH40 CS ASTM A106")
        assert cc == "0210"

    def test_bearing(self):
        cc, cn, sc, sn, conf = detect_class("DEEP GROOVE BALL BEARING 6205")
        assert cc == "0312"

    def test_unknown_class(self):
        cc, cn, sc, sn, conf = detect_class("WIDGET XYZ 123")
        assert cc is None
        assert conf == 0.0

    def test_butterfly_preferred_over_generic_valve(self):
        cc, cn, sc, sn, conf = detect_class("BUTTERFLY VALVE 6IN CL150")
        assert sc == "0007"  # butterfly, not generic


# ---------------------------------------------------------------------------
# Valve type extraction
# ---------------------------------------------------------------------------

class TestValveType:
    def test_ball(self):
        result = extract_valve_type("BALL VLV 2IN SS316")
        assert result.state == "KNOWN"
        assert result.value == "BALL"

    def test_gate(self):
        result = extract_valve_type("GATE VALVE 4 INCH WCB")
        assert result.state == "KNOWN"
        assert result.value == "GATE"

    def test_butterfly(self):
        result = extract_valve_type("BUTTERFLY VLV DN200 CI")
        assert result.state == "KNOWN"
        assert result.value == "BUTTERFLY"

    def test_check(self):
        result = extract_valve_type("NON RETURN VALVE 2IN SS304")
        assert result.state == "KNOWN"
        assert result.value == "CHECK"

    def test_unknown(self):
        result = extract_valve_type("VALVE 2IN SS316")
        assert result.state == "UNKNOWN"

    def test_confidence_high(self):
        result = extract_valve_type("BALL VALVE 2IN")
        assert result.confidence >= 0.95

    def test_state_never_na(self):
        result = extract_valve_type("SOMETHING RANDOM")
        assert result.state != "NA"


# ---------------------------------------------------------------------------
# Size extraction
# ---------------------------------------------------------------------------

class TestPrimarySize:
    def test_inch_to_mm(self):
        result = extract_primary_size("VALVE 2 INCH CL150")
        assert result.state == "KNOWN"
        assert result.value == "50"
        assert result.unit == "MM"

    def test_dn_notation(self):
        result = extract_primary_size("VALVE DN50 SS316")
        assert result.state == "KNOWN"
        assert result.value == "50"
        assert result.unit == "MM"

    def test_nb_notation(self):
        result = extract_primary_size("PIPE NB 100 CS")
        assert result.state == "KNOWN"
        assert result.value == "100"
        assert result.unit == "MM"

    def test_mm_notation(self):
        result = extract_primary_size("PIPE 50MM SCH40")
        assert result.state == "KNOWN"
        assert result.value == "50"
        assert result.unit == "MM"

    def test_quote_notation(self):
        result = extract_primary_size('VALVE 2" CL150')
        assert result.state == "KNOWN"
        assert result.value == "50"

    def test_4_inch(self):
        result = extract_primary_size("GATE VALVE 4 INCH 300#")
        assert result.state == "KNOWN"
        assert result.value == "100"

    def test_unknown_when_no_size(self):
        result = extract_primary_size("BALL VALVE SS316 FLANGED")
        assert result.state == "UNKNOWN"

    def test_fractional_inch(self):
        result = extract_primary_size('VALVE 1/2" CL150')
        assert result.state == "KNOWN"
        assert result.value == "15"


# ---------------------------------------------------------------------------
# Pressure extraction
# ---------------------------------------------------------------------------

class TestPressure:
    def test_cl150(self):
        result = extract_pressure("VALVE DN50 CL150 SS316")
        assert result.state == "KNOWN"
        assert result.value == "150"
        assert result.unit == "CLASS"

    def test_hash_notation(self):
        result = extract_pressure("VALVE 2IN 300# WCB")
        assert result.state == "KNOWN"
        assert result.value == "300"
        assert result.unit == "CLASS"

    def test_lb_notation(self):
        result = extract_pressure("VALVE 600 LB SS316")
        assert result.state == "KNOWN"
        assert result.value == "600"
        assert result.unit == "CLASS"

    def test_pn_notation(self):
        result = extract_pressure("VALVE PN16 CI FLANGED")
        assert result.state == "KNOWN"
        assert result.value == "16"
        assert result.unit == "BAR"

    def test_unknown_when_no_pressure(self):
        result = extract_pressure("BALL VALVE 2IN SS316 FLANGED")
        assert result.state == "UNKNOWN"

    def test_class_word(self):
        result = extract_pressure("VALVE CLASS 150 SS316")
        assert result.state == "KNOWN"
        assert result.value == "150"


# ---------------------------------------------------------------------------
# Material extraction
# ---------------------------------------------------------------------------

class TestMaterial:
    def setup_method(self):
        self.dictionary = TerminologyDictionary()

    def test_ss316(self):
        result = extract_material("VALVE 2IN SS316 FLANGED", self.dictionary)
        assert result.state == "KNOWN"
        assert "316" in result.value

    def test_wcb(self):
        result = extract_material("GATE VALVE 4IN A216 WCB BW", self.dictionary)
        assert result.state == "KNOWN"
        assert "WCB" in result.value or "A216" in result.value

    def test_a351_cf8m(self):
        result = extract_material("VALVE A351 CF8M FLANGED", self.dictionary)
        assert result.state == "KNOWN"

    def test_carbon_steel(self):
        result = extract_material("PIPE CS SCH40 2IN", self.dictionary)
        assert result.state == "KNOWN"

    def test_ptfe(self):
        result = extract_material("SEAT PTFE BALL VALVE", self.dictionary)
        assert result.state == "KNOWN"
        assert result.value == "PTFE"

    def test_unknown_material(self):
        result = extract_material("VALVE 2IN FLANGED", self.dictionary)
        assert result.state == "UNKNOWN"


# ---------------------------------------------------------------------------
# Connection extraction
# ---------------------------------------------------------------------------

class TestConnection:
    def test_flanged(self):
        result = extract_connection("VALVE 2IN SS316 FLANGED")
        assert result.state == "KNOWN"
        assert result.value == "FLANGED"

    def test_flg_abbreviation(self):
        result = extract_connection("BALL VLV 2IN CL150 FLG")
        assert result.state == "KNOWN"
        assert result.value == "FLANGED"

    def test_butt_weld(self):
        result = extract_connection("VALVE 4IN WCB BUTT WELD")
        assert result.state == "KNOWN"
        assert result.value == "BUTT_WELD"

    def test_bw_abbreviation(self):
        result = extract_connection("GATE VALVE 4IN WCB BW")
        assert result.state == "KNOWN"
        assert result.value == "BUTT_WELD"

    def test_socket_weld(self):
        result = extract_connection("GLOBE VALVE 1IN SW SS316")
        assert result.state == "KNOWN"
        assert result.value == "SOCKET_WELD"

    def test_threaded(self):
        result = extract_connection("BALL VALVE 1/2IN NPT THREADED")
        assert result.state == "KNOWN"

    def test_unknown_connection(self):
        result = extract_connection("VALVE 2IN SS316 CL150")
        assert result.state == "UNKNOWN"


# ---------------------------------------------------------------------------
# State constraint — NEVER return NA
# ---------------------------------------------------------------------------

class TestStateConstraint:
    """Critical: extraction service must never return state='NA'."""

    def test_no_na_in_full_extraction(self):
        descriptions = [
            "BALL VLV 2IN CL150 SS316 FLG",
            "GATE VALVE 4 INCH 300# WCB BW",
            "PIPE 2IN SCH40 CS A106",
            "DEEP GROOVE BEARING 6205",
            "WIDGET UNKNOWN DESCRIPTION XYZ",
        ]
        for desc in descriptions:
            result = extract_with_rules(desc)
            for attr_name, attr in result["attributes"].items():
                assert attr.state != "NA", (
                    f"Attribute '{attr_name}' returned state='NA' for input '{desc}'. "
                    "NA must only be set by the canonicalizer from the template."
                )

    def test_state_is_known_or_unknown(self):
        result = extract_with_rules("BUTTERFLY VALVE DN200 PN16 CAST IRON WAFER")
        for attr_name, attr in result["attributes"].items():
            assert attr.state in ("KNOWN", "UNKNOWN"), (
                f"Attribute '{attr_name}' has invalid state '{attr.state}'"
            )


# ---------------------------------------------------------------------------
# Safety pairs — different items must produce different extractions
# ---------------------------------------------------------------------------

class TestSafetyPairs:
    """
    Items differing only in pressure or material must never produce the same
    critical attribute set. This ensures the decision engine won't merge them.
    """

    def test_different_pressure_different_extraction(self):
        item_a = extract_with_rules("BALL VALVE 2IN CL150 SS316 FLANGED")
        item_b = extract_with_rules("BALL VALVE 2IN CL300 SS316 FLANGED")

        pressure_a = item_a["attributes"]["pressure"]
        pressure_b = item_b["attributes"]["pressure"]

        # Both should extract pressure
        assert pressure_a.state == "KNOWN"
        assert pressure_b.state == "KNOWN"
        # Values should be different
        assert pressure_a.value != pressure_b.value, (
            "Items with different pressures (CL150 vs CL300) produced the same pressure extraction. "
            "This would cause a false merge."
        )

    def test_different_material_different_extraction(self):
        item_a = extract_with_rules("BALL VALVE 2IN CL150 SS316 FLANGED")
        item_b = extract_with_rules("BALL VALVE 2IN CL150 A216WCB FLANGED")

        mat_a = item_a["attributes"]["material"]
        mat_b = item_b["attributes"]["material"]

        assert mat_a.state == "KNOWN"
        assert mat_b.state == "KNOWN"
        assert mat_a.value != mat_b.value, (
            "Items with different materials (SS316 vs A216WCB) produced the same material extraction."
        )

    def test_different_size_different_extraction(self):
        item_a = extract_with_rules("BALL VALVE 2IN CL150 SS316 FLANGED")
        item_b = extract_with_rules("BALL VALVE 4IN CL150 SS316 FLANGED")

        size_a = item_a["attributes"]["primary_size"]
        size_b = item_b["attributes"]["primary_size"]

        assert size_a.state == "KNOWN"
        assert size_b.state == "KNOWN"
        assert size_a.value != size_b.value


# ---------------------------------------------------------------------------
# All 20 dimensions present
# ---------------------------------------------------------------------------

class TestAllDimensionsPresent:
    ALL_DIMS = [
        "type", "primary_size", "length", "thickness", "material",
        "secondary_material", "pressure", "temperature", "flow",
        "electrical", "mechanical_loading", "stiffness_hardness",
        "connection", "actuation", "standard", "protection",
        "measurement", "coating", "manufacturer_part", "uom",
    ]

    def test_all_20_dims_returned(self):
        result = extract_with_rules("BALL VALVE 2IN CL150 SS316 FLANGED")
        for dim in self.ALL_DIMS:
            assert dim in result["attributes"], f"Dimension '{dim}' missing from extraction result"

    def test_unknown_dims_have_correct_structure(self):
        result = extract_with_rules("BALL VALVE 2IN CL150 SS316 FLANGED")
        for dim in self.ALL_DIMS:
            attr = result["attributes"][dim]
            assert hasattr(attr, "state")
            assert hasattr(attr, "confidence")
            assert hasattr(attr, "value")
            if attr.state == "UNKNOWN":
                assert attr.value is None
                assert attr.confidence == 0.0


# ---------------------------------------------------------------------------
# Model version
# ---------------------------------------------------------------------------

class TestModelVersion:
    def test_rules_version_in_output(self):
        result = extract_with_rules("BALL VLV 2IN CL150")
        assert result["model_version"] == "rules-v1"
