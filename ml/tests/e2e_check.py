import httpx, json, sys

base = "http://localhost:8001"

def check(label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {label}" + (f" — {detail}" if detail else ""))
    return condition

all_pass = True

# ── 1. Health ─────────────────────────────────────────────────────────
print("\n1. HEALTH")
r = httpx.get(f"{base}/health")
d = r.json()
all_pass &= check("status ok", d["status"] == "ok")
all_pass &= check("model_loaded false (rules-only)", d["model_loaded"] == False)
all_pass &= check("dictionary loaded", d["dictionary_version"] >= 1)
print("   ", d)

# ── 2. Version ────────────────────────────────────────────────────────
print("\n2. VERSION")
r = httpx.get(f"{base}/version")
d = r.json()
all_pass &= check("rules_version present", d["rules_version"] == "rules-v1")
print("   ", d)

# ── 3. Ball valve ─────────────────────────────────────────────────────
print("\n3. EXTRACT — ball valve")
r = httpx.post(f"{base}/extract", json={"text": "BALL VLV 2IN CL150 SS316 FLG"})
d = r.json()
attrs = d["attributes"]
all_pass &= check("class = 0112 (VALVE)", d["class_code"] == "0112")
all_pass &= check("subclass = 0003 (BALL)", d["subclass_code"] == "0003")
all_pass &= check("type = BALL", attrs["type"]["value"] == "BALL")
all_pass &= check("primary_size = 50 MM", attrs["primary_size"]["value"] == "50" and attrs["primary_size"]["unit"] == "MM")
all_pass &= check("pressure = 150 CLASS", attrs["pressure"]["value"] == "150" and attrs["pressure"]["unit"] == "CLASS")
all_pass &= check("material = SS316", attrs["material"]["value"] is not None and "316" in attrs["material"]["value"])
all_pass &= check("connection = FLANGED", attrs["connection"]["value"] == "FLANGED")
all_pass &= check("all 20 dims present", len(attrs) == 20)
all_pass &= check("no NA states", all(a["state"] != "NA" for a in attrs.values()))
for k in ["type","primary_size","pressure","material","connection"]:
    a = attrs[k]
    print(f"    {k:<20} state={a['state']} value={a['value']} unit={a['unit']} conf={a['confidence']}")

# ── 4. Gate valve ─────────────────────────────────────────────────────
print("\n4. EXTRACT — gate valve")
r = httpx.post(f"{base}/extract", json={"text": "GATE VALVE 4 INCH 300# A216 WCB BW"})
d = r.json()
attrs = d["attributes"]
all_pass &= check("type = GATE", attrs["type"]["value"] == "GATE")
all_pass &= check("primary_size = 100 MM (4 inch)", attrs["primary_size"]["value"] == "100")
all_pass &= check("pressure = 300", attrs["pressure"]["value"] == "300")
all_pass &= check("connection = BUTT_WELD", attrs["connection"]["value"] == "BUTT_WELD")
for k in ["type","primary_size","pressure","material","connection"]:
    a = attrs[k]
    print(f"    {k:<20} state={a['state']} value={a['value']} conf={a['confidence']}")

# ── 5. Pipe ───────────────────────────────────────────────────────────
print("\n5. EXTRACT — pipe")
r = httpx.post(f"{base}/extract", json={"text": "PIPE 2IN SCH40 CS ASTM A106"})
d = r.json()
attrs = d["attributes"]
all_pass &= check("class = 0210 (PIPE)", d["class_code"] == "0210")
all_pass &= check("size = 50 MM", attrs["primary_size"]["value"] == "50")
all_pass &= check("schedule extracted", attrs["thickness"]["state"] == "KNOWN")
print(f"    size={attrs['primary_size']['value']} thickness={attrs['thickness']['value']} material={attrs['material']['value']}")

# ── 6. Bearing ────────────────────────────────────────────────────────
print("\n6. EXTRACT — bearing")
r = httpx.post(f"{base}/extract", json={"text": "DEEP GROOVE BALL BEARING 6205 25MM BORE"})
d = r.json()
attrs = d["attributes"]
all_pass &= check("class = 0312 (BEARING)", d["class_code"] == "0312")
all_pass &= check("bearing number extracted", attrs["manufacturer_part"]["state"] == "KNOWN")
print(f"    class={d['class_code']} bore={attrs['primary_size']['value']} part={attrs['manufacturer_part']['value']}")

# ── 7. Batch ──────────────────────────────────────────────────────────
print("\n7. BATCH EXTRACT (4 items)")
r = httpx.post(f"{base}/extract/batch", json={"items": [
    {"text": "BALL VLV 2IN CL150 SS316 FLG"},
    {"text": "GATE VALVE 4IN 300# WCB BW"},
    {"text": "PIPE 2IN SCH40 CS A106"},
    {"text": "DEEP GROOVE BEARING 6205 25MM BORE"},
]})
d = r.json()
all_pass &= check("4 results returned", len(d["results"]) == 4)
for i, res in enumerate(d["results"]):
    print(f"    [{i}] class={res['class_code']} conf={res['class_confidence']} model={res['model_version']}")

# ── 8. Missing pressure (NEEDS_INFO case) ─────────────────────────────
print("\n8. NEEDS_INFO — no pressure in input")
r = httpx.post(f"{base}/extract", json={"text": "BALL VALVE 2IN SS316 FLANGED"})
d = r.json()
attrs = d["attributes"]
all_pass &= check("pressure = UNKNOWN (missing -> needs info)", attrs["pressure"]["state"] == "UNKNOWN")
all_pass &= check("type still KNOWN", attrs["type"]["state"] == "KNOWN")
print(f"    type={attrs['type']['value']} pressure_state={attrs['pressure']['state']}")

# ── 9. Safety pair — different pressure ───────────────────────────────
print("\n9. SAFETY — different pressure never same extraction")
r1 = httpx.post(f"{base}/extract", json={"text": "BALL VALVE 2IN CL150 SS316 FLANGED"})
r2 = httpx.post(f"{base}/extract", json={"text": "BALL VALVE 2IN CL300 SS316 FLANGED"})
p1 = r1.json()["attributes"]["pressure"]["value"]
p2 = r2.json()["attributes"]["pressure"]["value"]
all_pass &= check("CL150 != CL300", p1 != p2, f"p1={p1} p2={p2}")

# ── 10. Unknown class ─────────────────────────────────────────────────
print("\n10. UNKNOWN class input")
r = httpx.post(f"{base}/extract", json={"text": "WIDGET XYZ 123"})
d = r.json()
all_pass &= check("class_code = None", d["class_code"] is None)
all_pass &= check("no NA states", all(a["state"] != "NA" for a in d["attributes"].values()))

# ── Summary ───────────────────────────────────────────────────────────
print("\n" + "="*50)
if all_pass:
    print("ALL CHECKS PASSED")
else:
    print("SOME CHECKS FAILED — see above")
    sys.exit(1)
