"""
Text Cleaner Module
Developer 1: Backend Core
Applies active terminology dictionary mappings to standardize input text.
"""

import json
import os
import re

DICTIONARY_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "dictionaries", "terminology.json")
)


def safe_sub(term: str, replacement: str, text: str) -> str:
    """Substitutes terms safely, handling non-alphanumeric symbols like '#' or '\"'."""
    if re.search(r'[^\w]', term):
        return re.sub(re.escape(term), replacement, text)
    return re.sub(r'\b' + re.escape(term) + r'\b', replacement, text)


class TextCleaner:
    def __init__(self, dict_path=DICTIONARY_PATH):
        self.abbrev_map = {}
        self.material_map = {}
        self.rating_map = {}
        self.unit_map = {}
        self.load_dictionary(dict_path)

    def load_dictionary(self, path):
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for entry in data.get("entries", []):
            if not entry.get("active", True):
                continue
            term = entry["term"].upper()
            replacement = entry["replacement"].upper()
            kind = entry.get("kind", "ABBREVIATION")
            if kind == "ABBREVIATION":
                self.abbrev_map[term] = replacement
            elif kind == "MATERIAL":
                self.material_map[term] = replacement
            elif kind == "RATING":
                self.rating_map[term] = replacement
            elif kind == "UNIT":
                self.unit_map[term] = replacement

    def clean(self, text: str) -> str:
        if not text:
            return ""
        cleaned = text.upper()

        # Replace ratings like 150#
        for term, rep in self.rating_map.items():
            cleaned = safe_sub(term, rep, cleaned)

        # Replace abbreviations
        for term, rep in self.abbrev_map.items():
            cleaned = safe_sub(term, rep, cleaned)

        # Replace materials
        for term, rep in self.material_map.items():
            cleaned = safe_sub(term, rep, cleaned)

        # Normalize multiple spaces
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned
