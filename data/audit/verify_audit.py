"""
Audit Chain Hash Verification Module for SIH 26099 (Dev 4)
Verifies the tamper-proof SHA-256 hash chain across audit entries.
"""

import hashlib
import json

def compute_row_hash(prev_hash: str, entry_dict: dict) -> str:
    """
    Computes SHA-256(prev_hash || canonical json of row excluding hash and id).
    """
    clean_dict = {
        "ts": str(entry_dict.get("ts", "")),
        "actor": entry_dict.get("actor", ""),
        "action": entry_dict.get("action", ""),
        "entity": entry_dict.get("entity", ""),
        "entity_id": str(entry_dict.get("entity_id", "")),
        "before": entry_dict.get("before", {}),
        "after": entry_dict.get("after", {}),
        "evidence": entry_dict.get("evidence", {}),
        "prev_hash": prev_hash or ""
    }
    canonical_str = json.dumps(clean_dict, sort_keys=True)
    payload = f"{prev_hash or ''}{canonical_str}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

def verify_hash_chain(logs: list) -> dict:
    """
    Verifies a list of audit log entry dicts.
    Returns {"valid": True, "checked": N} or {"valid": False, "checked": N, "first_broken_id": id}
    """
    prev_hash = "GENESIS_BLOCK"
    checked = 0
    for entry in logs:
        expected = compute_row_hash(prev_hash, entry)
        actual = entry.get("hash")
        if actual != expected:
            return {
                "valid": False,
                "checked": checked,
                "first_broken_id": entry.get("id"),
                "expected_hash": expected,
                "actual_hash": actual
            }
        prev_hash = actual
        checked += 1
    return {"valid": True, "checked": checked}

if __name__ == "__main__":
    # Self-test
    e1 = {"id": 1, "ts": "2026-10-04T00:00:00Z", "actor": "system", "action": "CREATE", "entity": "cmc", "entity_id": "1", "before": {}, "after": {"code": "0112-0003-0050-0017-0150-0001-4"}}
    h1 = compute_row_hash("GENESIS_BLOCK", e1)
    e1["hash"] = h1
    
    res = verify_hash_chain([e1])
    print("Verification test result:", res)
    assert res["valid"] is True
