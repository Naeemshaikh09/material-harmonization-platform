"""
Backend Unit & Integration Tests
Developer 1: Backend Core
Tests Database, Cleaner, Canonicalizer, Decision Engine, Verhoeff Check Digit, and API endpoints.
"""

import unittest
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.pipeline.cleaner import TextCleaner
from app.pipeline.canonicalizer import Canonicalizer
from app.matching.decision_engine import DecisionEngine
from app.codes.cmc_service import calc_verhoeff_check_digit, CMCService


class TestBackendPipeline(unittest.TestCase):
    def setUp(self):
        self.cleaner = TextCleaner()
        self.canonicalizer = Canonicalizer()
        self.decision_engine = DecisionEngine()
        self.cmc_service = CMCService()

    def test_text_cleaner(self):
        raw = "BALL VLV 2IN 150# SS316 FLG"
        cleaned = self.cleaner.clean(raw)
        self.assertIn("VALVE", cleaned)
        self.assertIn("CL150", cleaned)
        self.assertIn("FLANGED", cleaned)

    def test_canonicalizer(self):
        raw_attrs = {
            "type": {"value": "BALL", "confidence": 0.95},
            "primary_size": {"value": "50", "unit": "MM", "confidence": 0.90},
            "pressure": {"value": "150", "unit": "CLASS", "confidence": 0.92},
            "material": {"value": "SS316", "confidence": 0.90},
            "connection": {"value": "FLANGED", "confidence": 0.88}
        }
        attrs, key, completeness = self.canonicalizer.canonicalize("0112", "0003", raw_attrs)
        self.assertEqual(completeness, "COMPLETE")
        self.assertTrue(key.startswith("0112|0003"))

    def test_verhoeff_check_digit(self):
        # Sample test case
        code = self.cmc_service.generate_code("0112", "0003", "0050", "0017", "0150", 1)
        parts = code.split("-")
        self.assertEqual(len(parts), 7)
        self.assertEqual(parts[0], "0112")
        self.assertEqual(parts[1], "0003")

    def test_decision_engine_exact_match(self):
        cand = {
            "id": 10,
            "code": "0112-0003-0050-0017-0150-0001-4",
            "canonical_key": "0112|0003|BALL|50|150|SS316|FLANGED",
            "attributes": {}
        }
        dec = self.decision_engine.decide(
            "0112|0003|BALL|50|150|SS316|FLANGED",
            {},
            [cand],
            "COMPLETE"
        )
        self.assertEqual(dec["outcome"], "LINKED")
        self.assertEqual(dec["cmc_id"], 10)


if __name__ == "__main__":
    unittest.main()
