"""
Terminology dictionary loader.
Reads from data/dictionaries/ — owned by developer4.
Falls back to built-in defaults so the service runs before developer4 delivers v1.

Dictionary kinds:
  ABBREVIATION  — VLV -> VALVE
  UNIT          — IN -> MM (with conversion factor)
  RATING        — 150# -> CL150
  MATERIAL      — SS316 -> SS316 (canonical form)
  SYNONYM       — additional synonyms
"""

from __future__ import annotations
import json
import os
import re
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Built-in fallback dictionary (Phase 0 / Phase 1 bootstrap)
# developer4 will replace/extend this via data/dictionaries/terminology.json
# ---------------------------------------------------------------------------

_BUILTIN_ABBREVIATIONS: Dict[str, str] = {
    # Valve types
    "VLV": "VALVE",
    "VLVE": "VALVE",
    "BV": "BALL VALVE",
    "GV": "GATE VALVE",
    "GLV": "GLOBE VALVE",
    "CV": "CHECK VALVE",
    "BFV": "BUTTERFLY VALVE",
    "PRV": "PRESSURE RELIEF VALVE",
    "PSV": "PRESSURE SAFETY VALVE",
    "NRV": "NON RETURN VALVE",
    "SOV": "SOLENOID VALVE",
    "MOV": "MOTOR OPERATED VALVE",
    "AOV": "AIR OPERATED VALVE",
    # Pipe / fitting types
    "PP": "PIPE",
    "ELB": "ELBOW",
    "TEE": "TEE",
    "RED": "REDUCER",
    "CAP": "CAP",
    "CPL": "COUPLING",
    "UNN": "UNION",
    "SKTW": "SOCKET WELD",
    # Connection
    "FLG": "FLANGED",
    "FLGD": "FLANGED",
    "FLNG": "FLANGED",
    "BW": "BUTT WELD",
    "SW": "SOCKET WELD",
    "THD": "THREADED",
    "THRD": "THREADED",
    "NPT": "NPT",
    "SCRD": "SCREWED",
    # Material
    "SS": "STAINLESS STEEL",
    "CS": "CARBON STEEL",
    "MS": "MILD STEEL",
    "CI": "CAST IRON",
    "DI": "DUCTILE IRON",
    "GI": "GALVANIZED IRON",
    "CU": "COPPER",
    "BR": "BRASS",
    "BRZ": "BRONZE",
    "PTFE": "PTFE",
    "PVC": "PVC",
    "HDPE": "HDPE",
    # Schedule / thickness
    "SCH": "SCHEDULE",
    "STD": "STANDARD",
    "XS": "EXTRA STRONG",
    "XXS": "DOUBLE EXTRA STRONG",
    # Actuation
    "HO": "HAND OPERATED",
    "MO": "MOTOR OPERATED",
    "AO": "AIR OPERATED",
    "EO": "ELECTRICALLY OPERATED",
    # Misc
    "NB": "NOMINAL BORE",
    "DN": "DN",
    "OD": "OUTER DIAMETER",
    "ID": "INNER DIAMETER",
    "LG": "LENGTH",
    "THK": "THICKNESS",
    "ANSI": "ANSI",
    "API": "API",
    "IS": "IS",
    "BS": "BS",
    "DIN": "DIN",
    "ASME": "ASME",
    "IBR": "IBR",
    "EA": "EA",
    "NOS": "NOS",
    "SET": "SET",
    "MTR": "MTR",
    "KG": "KG",
    "LT": "LT",
}

_BUILTIN_UNIT_SYNONYMS: Dict[str, Tuple[str, float]] = {
    # (canonical_unit, conversion_to_mm_or_base)
    "IN": ("MM", 25.4),
    "INCH": ("MM", 25.4),
    "\"": ("MM", 25.4),
    "′": ("MM", 25.4),
    "INCHES": ("MM", 25.4),
    "MM": ("MM", 1.0),
    "CM": ("MM", 10.0),
    "M": ("MM", 1000.0),
    "NB": ("MM", 1.0),   # treated as MM for nominal bore
    "DN": ("MM", 1.0),
    "OD": ("MM", 1.0),
}

_BUILTIN_RATING_SYNONYMS: Dict[str, str] = {
    "150#": "CL150",
    "300#": "CL300",
    "600#": "CL600",
    "900#": "CL900",
    "1500#": "CL1500",
    "2500#": "CL2500",
    "150 LB": "CL150",
    "300 LB": "CL300",
    "600 LB": "CL600",
    "CLASS 150": "CL150",
    "CLASS 300": "CL300",
    "CLASS 600": "CL600",
    "CL 150": "CL150",
    "CL 300": "CL300",
    "CL 600": "CL600",
    "PN10": "PN10",
    "PN16": "PN16",
    "PN25": "PN25",
    "PN40": "PN40",
}

_BUILTIN_MATERIAL_ALIASES: Dict[str, str] = {
    "SS304": "SS304",
    "SS 304": "SS304",
    "AISI 304": "SS304",
    "304": "SS304",
    "A182 F304": "SS304",
    "SS316": "SS316",
    "SS 316": "SS316",
    "316": "SS316",
    "316L": "SS316L",
    "SS316L": "SS316L",
    "AISI 316": "SS316",
    "A351 CF8M": "SS316",
    "A182 F316": "SS316",
    "A216 WCB": "A216WCB",
    "WCB": "A216WCB",
    "LCB": "A352LCB",
    "A352 LCB": "A352LCB",
    "CS": "CARBON STEEL",
    "CARBON STEEL": "CARBON STEEL",
    "A105": "A105",
    "ASTM A105": "A105",
    "GGG40": "DUCTILE IRON",
    "GGG 40": "DUCTILE IRON",
    "BRONZE": "BRONZE",
    "BRZ": "BRONZE",
    "PTFE": "PTFE",
    "P.T.F.E": "PTFE",
}


class TerminologyDictionary:
    """
    Loads the terminology dictionary from developer4's file if available,
    otherwise uses built-in defaults.
    """

    def __init__(self, dict_path: Optional[str] = None) -> None:
        self.abbreviations: Dict[str, str] = dict(_BUILTIN_ABBREVIATIONS)
        self.unit_synonyms: Dict[str, Tuple[str, float]] = dict(_BUILTIN_UNIT_SYNONYMS)
        self.rating_synonyms: Dict[str, str] = dict(_BUILTIN_RATING_SYNONYMS)
        self.material_aliases: Dict[str, str] = dict(_BUILTIN_MATERIAL_ALIASES)
        self.version: int = 0  # 0 = built-in fallback

        if dict_path and os.path.exists(dict_path):
            self._load_from_file(dict_path)

    def _load_from_file(self, path: str) -> None:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.version = data.get("version", 1)
        entries = data.get("entries", [])

        for entry in entries:
            if not entry.get("active", True):
                continue
            term = entry["term"].upper().strip()
            replacement = entry["replacement"].upper().strip()
            kind = entry.get("kind", "ABBREVIATION")

            if kind == "ABBREVIATION":
                self.abbreviations[term] = replacement
            elif kind == "UNIT":
                factor = entry.get("conversion_factor", 1.0)
                canonical_unit = entry.get("canonical_unit", replacement)
                self.unit_synonyms[term] = (canonical_unit, factor)
            elif kind == "RATING":
                self.rating_synonyms[term] = replacement
            elif kind == "MATERIAL":
                self.material_aliases[term] = replacement
            elif kind == "SYNONYM":
                self.abbreviations[term] = replacement

    def expand_abbreviations(self, text: str) -> str:
        """Replace known abbreviations with full terms. Word-boundary aware."""
        tokens = re.split(r"(\s+|[,./;:()\[\]])", text.upper())
        expanded = []
        for token in tokens:
            clean = token.strip()
            if clean in self.abbreviations:
                expanded.append(self.abbreviations[clean])
            else:
                expanded.append(token)
        return "".join(expanded)

    def normalize_rating(self, text: str) -> Optional[str]:
        """Return canonical rating like CL150 if found."""
        upper = text.upper().strip()
        for k, v in self.rating_synonyms.items():
            if k in upper:
                return v
        return None

    def normalize_material(self, text: str) -> Optional[str]:
        """Return canonical material alias."""
        upper = text.upper().strip()
        return self.material_aliases.get(upper)

    def get_unit_info(self, raw_unit: str) -> Tuple[str, float]:
        """Return (canonical_unit, conversion_factor)."""
        upper = raw_unit.upper().strip()
        return self.unit_synonyms.get(upper, (upper, 1.0))


# Singleton — loaded once at service startup
_dictionary: Optional[TerminologyDictionary] = None


def get_dictionary() -> TerminologyDictionary:
    global _dictionary
    if _dictionary is None:
        dict_path = os.environ.get(
            "TERMINOLOGY_DICT_PATH",
            os.path.join(
                os.path.dirname(__file__),
                "../../data/dictionaries/terminology.json",
            ),
        )
        _dictionary = TerminologyDictionary(dict_path)
    return _dictionary


def reload_dictionary() -> None:
    """Force reload — call when developer4 updates the dictionary file."""
    global _dictionary
    _dictionary = None
    get_dictionary()
