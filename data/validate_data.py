"""
Data Validator for SIH 26099 (Dev 4)
Checks validity, uniqueness of codes, schema completeness, and dictionary integrity.
"""

import json
import os
import glob

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

def validate_terminology():
    path = os.path.join(DATA_DIR, "dictionaries", "terminology.json")
    if not os.path.exists(path):
        print(f"FAILED: {path} missing")
        return False
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    entries = data.get("entries", [])
    print(f"[OK] Terminology dictionary loaded: {len(entries)} entries")
    return True

def validate_templates():
    template_files = glob.glob(os.path.join(DATA_DIR, "templates", "*.json"))
    if not template_files:
        print("FAILED: No template files found")
        return False
    for tf in template_files:
        with open(tf, "r", encoding="utf-8") as f:
            t = json.load(f)
        assert "class_code" in t, f"Missing class_code in {tf}"
        assert "dimensions" in t, f"Missing dimensions in {tf}"
        print(f"[OK] Class template valid: {t.get('class_name')} ({t.get('class_code')})")
    return True

def validate_code_tables():
    ct_files = glob.glob(os.path.join(DATA_DIR, "code_tables", "*.json"))
    if not ct_files:
        print("FAILED: No code tables found")
        return False
    for cf in ct_files:
        with open(cf, "r", encoding="utf-8") as f:
            ct = json.load(f)
        name = ct.get("name")
        values = ct.get("values", [])
        codes = [v["code"] for v in values]
        assert len(codes) == len(set(codes)), f"Duplicate codes found in code table {name}"
        print(f"[OK] Code table valid: {name} ({len(values)} values)")
    return True

def main():
    print("=== SIH 26099 Data Validation Suite (Dev 4) ===")
    v1 = validate_terminology()
    v2 = validate_templates()
    v3 = validate_code_tables()
    if v1 and v2 and v3:
        print(">>> ALL DEV 4 DATA VALIDATION CHECKS PASSED <<<")
    else:
        print(">>> DATA VALIDATION FAILED <<<")

if __name__ == "__main__":
    main()
