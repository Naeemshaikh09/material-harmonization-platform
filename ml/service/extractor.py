"""
Rules-based extractor — Phase 1 baseline.
Runs before the SLM. The SLM fills in what rules miss.

Covers: valves, pipes, bearings (demo categories).
Returns only KNOWN or UNKNOWN states — never NA.

Rule order per attribute:
  1. Try specific pattern
  2. Try dictionary expansion on matched span
  3. If nothing found -> UNKNOWN
"""

from __future__ import annotations
import re
from typing import Dict, Optional, Tuple

try:
    from .dictionary import TerminologyDictionary, get_dictionary
    from .schemas import AttributeResult
except ImportError:
    from dictionary import TerminologyDictionary, get_dictionary
    from schemas import AttributeResult


RULES_VERSION = "rules-v1"

# ---------------------------------------------------------------------------
# Class / subclass detection
# ---------------------------------------------------------------------------

# (pattern, class_code, class_name, subclass_code, subclass_name, confidence)
CLASS_RULES: list[tuple] = [
    # Valves — order matters (more specific first)
    (r"\bBUTTERFLY\s*VALVE\b|\bBFV\b",          "0112", "VALVE", "0007", "BUTTERFLY_VALVE",  0.97),
    (r"\bBALL\s*VALVE\b|\bBALL\s*VLV\b|\bBV\b",  "0112", "VALVE", "0003", "BALL_VALVE",       0.97),
    (r"\bGATE\s*VALVE\b|\bGATE\s*VLV\b|\bGV\b",  "0112", "VALVE", "0001", "GATE_VALVE",       0.97),
    (r"\bGLOBE\s*VALVE\b|\bGLOBE\s*VLV\b",       "0112", "VALVE", "0002", "GLOBE_VALVE",      0.97),
    (r"\bCHECK\s*VALVE\b|\bNRV\b|\bNON\s*RETURN","0112", "VALVE", "0004", "CHECK_VALVE",      0.95),
    (r"\bPRESS(?:URE)?\s*RELIEF|\bPRV\b|\bPSV\b","0112", "VALVE", "0005", "RELIEF_VALVE",     0.95),
    (r"\bSOLENOID\s*VALVE\b|\bSOV\b",             "0112", "VALVE", "0008", "SOLENOID_VALVE",   0.95),
    (r"\bVALVE\b|\bVLV\b|\bVLVE\b",              "0112", "VALVE", None,   None,               0.85),
    # Pipes and fittings
    (r"\bELBOW\b|\bELB\b",                        "0211", "PIPE_FITTING", "0002", "ELBOW",     0.95),
    (r"\bTEE\b",                                   "0211", "PIPE_FITTING", "0003", "TEE",       0.95),
    (r"\bREDUCER\b|\bRED\b",                       "0211", "PIPE_FITTING", "0004", "REDUCER",   0.95),
    (r"\bFLANGE\b|\bFLNG\b",                       "0211", "PIPE_FITTING", "0005", "FLANGE",    0.95),
    (r"\bPIPE\b|\bTUBE\b|\bTUBING\b",             "0210", "PIPE",         "0001", "PIPE",       0.90),
    # Bearings
    (r"\bTAPER(?:ED)?\s*ROLLER\b",                "0312", "BEARING", "0003", "TAPER_ROLLER_BEARING", 0.97),
    (r"\bDEEP\s*GROOVE\b|\bRADIAL\b",             "0312", "BEARING", "0001", "DEEP_GROOVE_BEARING",  0.95),
    (r"\bANGULAR\s*CONTACT\b",                    "0312", "BEARING", "0002", "ANGULAR_CONTACT_BEARING", 0.97),
    (r"\bTHRUST\s*BEARING\b",                     "0312", "BEARING", "0004", "THRUST_BEARING", 0.95),
    (r"\bSELF[- ]ALIGN(?:ING)?\b",               "0312", "BEARING", "0005", "SELF_ALIGNING_BEARING", 0.95),
    (r"\bBEARING\b|\bBRNG\b",                     "0312", "BEARING", None,   None,              0.80),
]


def detect_class(text: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str], float]:
    """Returns (class_code, class_name, subclass_code, subclass_name, confidence)."""
    upper = text.upper()
    for pattern, cc, cn, sc, sn, conf in CLASS_RULES:
        if re.search(pattern, upper):
            return cc, cn, sc, sn, conf
    return None, None, None, None, 0.0


# ---------------------------------------------------------------------------
# Attribute extractors
# ---------------------------------------------------------------------------

def _make_known(value: str, unit: Optional[str], confidence: float, span: str) -> AttributeResult:
    return AttributeResult(
        value=value,
        unit=unit,
        state="KNOWN",
        confidence=confidence,
        source_span=span,
    )


def _make_unknown() -> AttributeResult:
    return AttributeResult(value=None, unit=None, state="UNKNOWN", confidence=0.0, source_span=None)


# --- valve type ---
_VALVE_TYPE_PATTERNS = [
    (r"\bBALL\b",                    "BALL",        0.98),
    (r"\bGATE\b",                    "GATE",        0.98),
    (r"\bGLOBE\b",                   "GLOBE",       0.98),
    (r"\bCHECK\b|\bNON[- ]RETURN\b","CHECK",       0.95),
    (r"\bBUTTERFLY\b",               "BUTTERFLY",   0.98),
    (r"\bNEEDLE\b",                  "NEEDLE",      0.97),
    (r"\bPLUG\b",                    "PLUG",        0.95),
    (r"\bPINTLE\b",                  "PINTLE",      0.90),
    (r"\bDIAPHRAGM\b",               "DIAPHRAGM",   0.95),
    (r"\bRELIEF\b|\bSAFETY\b",       "RELIEF",      0.95),
    (r"\bPRESSURE\s*REDUCING\b",     "PRESSURE_REDUCING", 0.95),
]


def extract_valve_type(text: str) -> AttributeResult:
    upper = text.upper()
    for pattern, val, conf in _VALVE_TYPE_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            return _make_known(val, None, conf, m.group(0))
    return _make_unknown()


# --- primary size ---
_SIZE_PATTERNS = [
    # DN50, DN 50
    (r"\bDN\s*(\d+(?:\.\d+)?)\b",            "MM",   0.97),
    # NB50, NB 50
    (r"\bNB\s*(\d+(?:\.\d+)?)\b",            "MM",   0.95),
    # 50MM, 50 MM
    (r"\b(\d+(?:\.\d+)?)\s*MM\b",            "MM",   0.97),
    # 2", 2 INCH, 2IN, 2 IN
    (r'\b(\d+(?:[./]\d+)?)\s*(?:"|INCH(?:ES)?|IN\b)', "IN", 0.95),
    # 2.5 INCH
    (r"\b(\d+\.\d+)\s*(?:INCH(?:ES)?|IN\b)", "IN",   0.95),
    # bare number followed by # (pressure class — skip, handle separately)
    # 1/2", 3/4" fractions
    (r'\b(\d+/\d+)\s*(?:"|INCH(?:ES)?|IN\b)', "IN",  0.93),
]

_INCH_TO_MM = {
    "1/2": 15, "3/4": 20, "1": 25, "1.5": 40, "1 1/2": 40,
    "2": 50, "2.5": 65, "2 1/2": 65, "3": 80, "4": 100,
    "5": 125, "6": 150, "8": 200, "10": 250, "12": 300,
    "14": 350, "16": 400, "18": 450, "20": 500, "24": 600,
}


def _inch_to_mm(raw: str) -> Optional[str]:
    """Convert inch string to nearest DN size in mm."""
    raw = raw.strip()
    if "/" in raw:
        parts = raw.split("/")
        try:
            val = int(parts[0]) / int(parts[1])
            raw_f = f"{val:.1f}"
        except (ValueError, ZeroDivisionError):
            return None
    else:
        raw_f = raw
    return str(_INCH_TO_MM.get(raw_f, _INCH_TO_MM.get(raw, None)))


def extract_primary_size(text: str) -> AttributeResult:
    upper = text.upper()
    for pattern, unit, conf in _SIZE_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            raw_val = m.group(1)
            if unit == "IN":
                mm_val = _inch_to_mm(raw_val)
                if mm_val:
                    return _make_known(mm_val, "MM", conf, m.group(0))
                # keep as inch if no conversion
                return _make_known(raw_val, "IN", conf - 0.05, m.group(0))
            return _make_known(raw_val, unit, conf, m.group(0))
    return _make_unknown()


# --- pressure / rating ---
_PRESSURE_PATTERNS = [
    # CL150, CLASS 150, CL 150
    (r"\bCL(?:ASS)?\s*(\d+)\b",                  "CLASS", 0.97),
    # 150#, 300#  (# is non-word char so no \b after it)
    (r"\b(\d+)\s*#(?:\s|$|[A-Z])",               "CLASS", 0.95),
    # 150 LB, 300 LBS
    (r"\b(\d+)\s*LBS?\b",                         "CLASS", 0.93),
    # PN10, PN16, PN 16
    (r"\bPN\s*(\d+)\b",                           "BAR",   0.95),
    # 150 BAR, 10 BAR
    (r"\b(\d+(?:\.\d+)?)\s*BAR\b",               "BAR",   0.95),
    # 150 PSI
    (r"\b(\d+(?:\.\d+)?)\s*PSI\b",               "PSI",   0.95),
    # 150 KG/CM2
    (r"\b(\d+(?:\.\d+)?)\s*KG[/\s]*CM2?\b",      "KGF/CM2", 0.90),
]


def extract_pressure(text: str) -> AttributeResult:
    upper = text.upper()
    for pattern, unit, conf in _PRESSURE_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            return _make_known(m.group(1), unit, conf, m.group(0))
    return _make_unknown()


# --- material ---
_MATERIAL_PATTERNS = [
    # Stainless grades
    (r"\b(SS\s*316L?)\b",                    0.97),
    (r"\b(SS\s*304L?)\b",                    0.97),
    (r"\b(316L?)\b",                         0.90),
    (r"\b(304L?)\b",                         0.88),
    (r"\b(A351\s*CF8M)\b",                   0.97),
    (r"\b(A182\s*F3(?:04|16)L?)\b",          0.97),
    (r"\b(STAINLESS\s*STEEL)\b",             0.85),
    (r"\b(S\.?\s*S\.?)\b",                   0.80),
    # Carbon / alloy steel
    (r"\b(A216\s*WCB|WCB)\b",               0.97),
    (r"\b(A105)\b",                          0.97),
    (r"\b(CARBON\s*STEEL|CS)\b",             0.85),
    (r"\b(MILD\s*STEEL|MS)\b",              0.85),
    # Cast / ductile iron
    (r"\b(DUCTILE\s*IRON|DI)\b",            0.90),
    (r"\b(CAST\s*IRON|CI)\b",               0.90),
    (r"\b(GGG\s*40)\b",                     0.92),
    # Non-ferrous
    (r"\b(BRONZE|BRZ)\b",                   0.95),
    (r"\b(BRASS|BR)\b",                     0.95),
    (r"\b(COPPER|CU)\b",                    0.95),
    # Non-metallic
    (r"\b(PTFE|P\.T\.F\.E)\b",              0.97),
    (r"\b(PVC)\b",                          0.95),
    (r"\b(HDPE)\b",                         0.95),
]


def extract_material(text: str, dictionary: TerminologyDictionary) -> AttributeResult:
    upper = text.upper()
    for pattern, conf in _MATERIAL_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            raw = m.group(1).strip()
            canonical = dictionary.normalize_material(raw) or raw.replace(" ", "").replace(".", "")
            return _make_known(canonical, None, conf, m.group(0))
    return _make_unknown()


# --- connection ---
_CONNECTION_PATTERNS = [
    (r"\bFLANGED?\b|\bFLNG\b|\bFLGD\b|\bFLG\b",   "FLANGED",     0.97),
    (r"\bBUTT[_\s]*WELD\b|\bBW\b",                "BUTT_WELD",   0.97),
    (r"\bSOCKET[_\s]*WELD\b|\bSW\b|\bSKTW\b",     "SOCKET_WELD", 0.97),
    (r"\bTHREADED\b|\bTHRD\b|\bTHD\b|\bSCRD\b",   "THREADED",    0.95),
    (r"\bNPT\b",                                  "NPT",         0.97),
    (r"\bBSP\b|\bBSPT\b",                         "BSP",         0.97),
    (r"\bWAFER\b",                                "WAFER",       0.95),
    (r"\bLUG\b",                                  "LUG",         0.95),
    (r"\bCLAMP\b",                                "CLAMP",       0.90),
    (r"\bCOMPRESS(?:ION)?\b",                     "COMPRESSION", 0.90),
]


def extract_connection(text: str) -> AttributeResult:
    upper = text.upper()
    for pattern, val, conf in _CONNECTION_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            return _make_known(val, None, conf, m.group(0))
    return _make_unknown()


# --- actuation ---
_ACTUATION_PATTERNS = [
    (r"\bMOTOR\s*OPERATED\b|\bMOV\b|\bMO\b",         "MOTOR_OPERATED",    0.97),
    (r"\bAIR\s*OPERATED\b|\bPNEUMATIC\b|\bAOV\b",    "AIR_OPERATED",      0.97),
    (r"\bSOLENOID\b|\bSOV\b",                         "SOLENOID",          0.97),
    (r"\bHAND\s*WHEEL\b|\bHW\b",                      "HAND_WHEEL",        0.95),
    (r"\bGEAR\s*OPERATED\b|\bGEAR\b",                "GEAR_OPERATED",     0.90),
    (r"\bELECTRIC\b|\bELEC\b|\bEO\b",                "ELECTRIC_OPERATED", 0.90),
    (r"\bHAND\s*LEV(?:ER)?\b|\bLEVER\b",             "LEVER",             0.93),
    (r"\bMANUAL\b",                                   "MANUAL",            0.90),
]


def extract_actuation(text: str) -> AttributeResult:
    upper = text.upper()
    for pattern, val, conf in _ACTUATION_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            return _make_known(val, None, conf, m.group(0))
    return _make_unknown()


# --- governing standard ---
_STANDARD_PATTERNS = [
    (r"\b(ASME\s*B\s*[\d.]+)\b",    0.97),
    (r"\b(API\s*\d+\w*)\b",         0.97),
    (r"\b(IS\s*\d+(?:[:/]\d+)?)\b", 0.95),
    (r"\b(BS\s*\d+(?:[:/]\d+)?)\b", 0.95),
    (r"\b(DIN\s*\d+)\b",            0.95),
    (r"\b(ANSI\s*[\w.]+)\b",        0.93),
    (r"\b(IBR)\b",                  0.97),
    (r"\b(EN\s*\d+)\b",             0.93),
]


def extract_standard(text: str) -> AttributeResult:
    upper = text.upper()
    for pattern, conf in _STANDARD_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            return _make_known(m.group(1).strip(), None, conf, m.group(0))
    return _make_unknown()


# --- temperature ---
_TEMP_PATTERNS = [
    (r"\b(\-?\d+(?:\.\d+)?)\s*DEG\s*C\b",   "DEG_C",  0.95),
    (r"\b(\-?\d+(?:\.\d+)?)\s*°C\b",         "DEG_C",  0.97),
    (r"\b(\-?\d+(?:\.\d+)?)\s*DEG\s*F\b",   "DEG_F",  0.95),
    (r"\b(\-?\d+(?:\.\d+)?)\s*°F\b",         "DEG_F",  0.97),
    (r"\b(\-?\d+(?:\.\d+)?)\s*K\b",          "KELVIN", 0.90),
]


def extract_temperature(text: str) -> AttributeResult:
    upper = text.upper()
    for pattern, unit, conf in _TEMP_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            return _make_known(m.group(1), unit, conf, m.group(0))
    return _make_unknown()


# --- thickness / schedule ---
_THICKNESS_PATTERNS = [
    (r"\bSCH(?:EDULE)?\s*(\d+(?:S|XS|XXS)?)\b",    "SCH",  0.97),
    (r"\b(XS|EXTRA\s*STRONG)\b",                    "SCH",  0.93),
    (r"\b(XXS|DOUBLE\s*EXTRA\s*STRONG)\b",          "SCH",  0.93),
    (r"\b(STD|STANDARD)\b",                         "SCH",  0.85),
    (r"\b(\d+(?:\.\d+)?)\s*MM\s*THK\b",             "MM",   0.95),
    (r"\bTHK\s*(\d+(?:\.\d+)?)\s*MM\b",             "MM",   0.95),
]


def extract_thickness(text: str) -> AttributeResult:
    upper = text.upper()
    for pattern, unit, conf in _THICKNESS_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            return _make_known(m.group(1).strip(), unit, conf, m.group(0))
    return _make_unknown()


# --- UOM ---
_UOM_PATTERNS = [
    (r"\bEACH\b|\bEA\b|\bNOS?\b|\bNUMBERS?\b",  "EA",   0.95),
    (r"\bSETS?\b",                               "SET",  0.95),
    (r"\bMETR(?:ES?|ERS?)\b|\bMTRS?\b|\bM\b",   "M",    0.90),
    (r"\bKILOGRAMS?\b|\bKGS?\b",                 "KG",   0.95),
    (r"\bLITRES?\b|\bLTS?\b|\bLITERS?\b",       "LT",   0.95),
    (r"\bPAIRS?\b|\bPR\b",                       "PR",   0.90),
    (r"\bROLL\b",                                "ROLL", 0.90),
    (r"\bLENGTH\b|\bLG\b",                      "LG",   0.88),
]


def extract_uom(text: str) -> AttributeResult:
    upper = text.upper()
    for pattern, val, conf in _UOM_PATTERNS:
        m = re.search(pattern, upper)
        if m:
            return _make_known(val, None, conf, m.group(0))
    return _make_unknown()


# --- bearing-specific ---
_BORE_PATTERN = re.compile(r"\b(\d+)\s*MM\s*(?:BORE|ID|INNER)\b", re.IGNORECASE)
_OD_PATTERN = re.compile(r"\b(\d+)\s*MM\s*(?:OD|OUTER|OUTSIDE)\b", re.IGNORECASE)
_WIDTH_PATTERN = re.compile(r"\b(\d+)\s*MM\s*(?:WIDTH|W|WIDE)\b", re.IGNORECASE)
_BEARING_NO_PATTERN = re.compile(
    r"\b((?:6|7|N|NU|NJ|NA|29|30|31|32|33)\d{3,4}[A-Z]{0,4}(?:/[A-Z0-9]+)?)\b",
    re.IGNORECASE,
)


def extract_bearing_attributes(text: str) -> Dict[str, AttributeResult]:
    """Extra attributes for bearings: uses primary_size as bore."""
    result: Dict[str, AttributeResult] = {}
    upper = text.upper()

    # Bore diameter as primary_size
    m = _BORE_PATTERN.search(upper)
    if m:
        result["primary_size"] = _make_known(m.group(1), "MM", 0.97, m.group(0))

    # OD as length (repurpose)
    m = _OD_PATTERN.search(upper)
    if m:
        result["length"] = _make_known(m.group(1), "MM", 0.95, m.group(0))

    # Width as thickness
    m = _WIDTH_PATTERN.search(upper)
    if m:
        result["thickness"] = _make_known(m.group(1), "MM", 0.95, m.group(0))

    # Bearing number as manufacturer_part
    m = _BEARING_NO_PATTERN.search(upper)
    if m:
        result["manufacturer_part"] = _make_known(m.group(1).upper(), None, 0.95, m.group(0))

    return result


# ---------------------------------------------------------------------------
# Main rules extractor
# ---------------------------------------------------------------------------

ALL_DIMENSIONS = [
    "type", "primary_size", "length", "thickness", "material",
    "secondary_material", "pressure", "temperature", "flow",
    "electrical", "mechanical_loading", "stiffness_hardness",
    "connection", "actuation", "standard", "protection",
    "measurement", "coating", "manufacturer_part", "uom",
]


def extract_with_rules(text: str, class_hint: Optional[str] = None) -> Dict:
    """
    Main entry point for the rules extractor.
    Returns a dict compatible with ExtractionResponse.
    """
    dictionary = get_dictionary()

    # Step 1: expand abbreviations
    expanded = dictionary.expand_abbreviations(text)

    # Step 2: detect class
    class_code, class_name, subclass_code, subclass_name, class_conf = detect_class(expanded)

    # Override with hint if provided and class not detected
    if class_hint and not class_code:
        hint_upper = class_hint.upper()
        if "VALVE" in hint_upper:
            class_code, subclass_code, class_conf = "0112", None, 0.70
        elif "PIPE" in hint_upper:
            class_code, subclass_code, class_conf = "0210", None, 0.70
        elif "BEARING" in hint_upper:
            class_code, subclass_code, class_conf = "0312", None, 0.70

    # Step 3: extract attributes
    attrs: Dict[str, AttributeResult] = {}

    if class_code == "0112":  # VALVE
        attrs["type"] = extract_valve_type(expanded)
        attrs["primary_size"] = extract_primary_size(expanded)
        attrs["pressure"] = extract_pressure(expanded)
        attrs["material"] = extract_material(expanded, dictionary)
        attrs["connection"] = extract_connection(expanded)
        attrs["actuation"] = extract_actuation(expanded)
        attrs["standard"] = extract_standard(expanded)
        attrs["temperature"] = extract_temperature(expanded)
        attrs["thickness"] = extract_thickness(expanded)
        attrs["uom"] = extract_uom(expanded)

    elif class_code == "0210":  # PIPE
        attrs["primary_size"] = extract_primary_size(expanded)
        attrs["thickness"] = extract_thickness(expanded)
        attrs["material"] = extract_material(expanded, dictionary)
        attrs["pressure"] = extract_pressure(expanded)
        attrs["standard"] = extract_standard(expanded)
        attrs["connection"] = extract_connection(expanded)
        attrs["temperature"] = extract_temperature(expanded)
        attrs["uom"] = extract_uom(expanded)

    elif class_code == "0211":  # PIPE FITTING
        attrs["primary_size"] = extract_primary_size(expanded)
        attrs["material"] = extract_material(expanded, dictionary)
        attrs["connection"] = extract_connection(expanded)
        attrs["pressure"] = extract_pressure(expanded)
        attrs["standard"] = extract_standard(expanded)
        attrs["uom"] = extract_uom(expanded)

    elif class_code == "0312":  # BEARING
        bearing_attrs = extract_bearing_attributes(expanded)
        attrs.update(bearing_attrs)
        attrs["material"] = extract_material(expanded, dictionary)
        attrs["standard"] = extract_standard(expanded)
        attrs["uom"] = extract_uom(expanded)

    else:
        # Unknown class — try generic extraction
        attrs["primary_size"] = extract_primary_size(expanded)
        attrs["pressure"] = extract_pressure(expanded)
        attrs["material"] = extract_material(expanded, dictionary)
        attrs["connection"] = extract_connection(expanded)
        attrs["standard"] = extract_standard(expanded)
        attrs["uom"] = extract_uom(expanded)

    # Step 4: fill remaining dimensions as UNKNOWN
    for dim in ALL_DIMENSIONS:
        if dim not in attrs:
            attrs[dim] = _make_unknown()

    return {
        "class_code": class_code,
        "subclass_code": subclass_code,
        "class_confidence": class_conf,
        "attributes": attrs,
        "model_version": RULES_VERSION,
    }
