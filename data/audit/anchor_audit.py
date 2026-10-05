"""
Audit Chain Anchor Script for SIH 26099 (Dev 4)
Anchors the latest audit chain hash to an external file or external log.
"""

import json
import os
import datetime

ANCHOR_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "anchors.json")

def anchor_hash(audit_id: int, latest_hash: str, location: str = "local_fs") -> dict:
    anchors = []
    if os.path.exists(ANCHOR_FILE):
        with open(ANCHOR_FILE, "r", encoding="utf-8") as f:
            try:
                anchors = json.load(f)
            except Exception:
                anchors = []
                
    record = {
        "id": len(anchors) + 1,
        "audit_id": audit_id,
        "hash": latest_hash,
        "anchored_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "location": location
    }
    anchors.append(record)
    with open(ANCHOR_FILE, "w", encoding="utf-8") as f:
        json.dump(anchors, f, indent=2)
    return record

if __name__ == "__main__":
    res = anchor_hash(1, "abc123def456hash")
    print("Anchored hash successfully:", res)
