"""
Synthetic Catalog Generator for SIH 26099 (Dev 4)
Generates 3 synthetic CPSE catalog files with intentional duplicate items, messy descriptions,
and non-standard formatting across CPSE_A, CPSE_B, and CPSE_C.
"""

import json
import csv
import os
import random

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

VALVE_DESCRIPTIONS = [
    ("BALL VALVE 2\" CL150 SS316 FLGD", "0112", "0003", {"primary_size": "50", "pressure": "150", "material": "SS316", "type": "BALL", "connection": "FLANGED"}),
    ("VLV BALL 50MM 150# STAINLESS 316 FLG", "0112", "0003", {"primary_size": "50", "pressure": "150", "material": "SS316", "type": "BALL", "connection": "FLANGED"}),
    ("VALVE, BALL, DN50, CLASS 150, SS316, FLANGED ENDS", "0112", "0003", {"primary_size": "50", "pressure": "150", "material": "SS316", "type": "BALL", "connection": "FLANGED"}),
    ("GATE VLV 4 INCH 300# A216 WCB BUTT WELD", "0112", "0001", {"primary_size": "100", "pressure": "300", "material": "A216WCB", "type": "GATE", "connection": "BUTT_WELD"}),
    ("VLV GATE 100MM CL300 CS BW", "0112", "0001", {"primary_size": "100", "pressure": "300", "material": "A216WCB", "type": "GATE", "connection": "BUTT_WELD"}),
    ("GLOBE VALVE 3IN CL600 SS304 SW", "0112", "0002", {"primary_size": "80", "pressure": "600", "material": "SS304", "type": "GLOBE", "connection": "SOCKET_WELD"}),
    ("VLV GLOBE 80MM 600# STAINLESS STEEL 304 SOCKET WELD", "0112", "0002", {"primary_size": "80", "pressure": "600", "material": "SS304", "type": "GLOBE", "connection": "SOCKET_WELD"}),
    ("CHECK VALVE 6\" CL150 CAST IRON FLANGED", "0112", "0004", {"primary_size": "150", "pressure": "150", "material": "CAST_IRON", "type": "CHECK", "connection": "FLANGED"}),
    ("BUTTERFLY VALVE 8 INCH PN16 CS WAFER", "0112", "0005", {"primary_size": "200", "pressure": "PN16", "material": "CARBON_STEEL", "type": "BUTTERFLY", "connection": "WAFER"}),
]

PIPE_DESCRIPTIONS = [
    ("PIPE SEAMLESS 4\" SCH40 A106B", "0113", "0010", {"primary_size": "100", "thickness": "SCH40", "material": "A106B", "type": "SEAMLESS"}),
    ("CS PIPE SMLS 100MM SCHEDULE 40 ASTM A106 GR B 6M", "0113", "0010", {"primary_size": "100", "thickness": "SCH40", "material": "A106B", "type": "SEAMLESS"}),
    ("PIPE ERW 6 INCH SCH80 SS316L", "0113", "0011", {"primary_size": "150", "thickness": "SCH80", "material": "SS316L", "type": "ERW"}),
]

BEARING_DESCRIPTIONS = [
    ("DEEP GROOVE BALL BEARING 25MM BORE 6205-2RS", "0114", "0020", {"primary_size": "25", "protection": "2RS", "manufacturer_part": "6205-2RS", "type": "DEEP_GROOVE"}),
    ("BEARING 6205 2RS SKF 25X52X15", "0114", "0020", {"primary_size": "25", "protection": "2RS", "manufacturer_part": "6205-2RS", "type": "DEEP_GROOVE"}),
    ("TAPERED ROLLER BEARING 50MM BORE 32210", "0114", "0021", {"primary_size": "50", "protection": "OPEN", "manufacturer_part": "32210", "type": "TAPERED_ROLLER"}),
]

CPSE_NAMES = ["CPSE_A", "CPSE_B", "CPSE_C"]

def generate_catalogs():
    random.seed(42)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    all_items = VALVE_DESCRIPTIONS + PIPE_DESCRIPTIONS + BEARING_DESCRIPTIONS
    
    for cpse in CPSE_NAMES:
        filepath = os.path.join(OUTPUT_DIR, f"catalog_{cpse.lower()}.csv")
        rows = []
        code_counter = 10001
        for item in all_items:
            # Vary description slightly per CPSE
            desc = item[0]
            if cpse == "CPSE_B":
                desc = desc.lower().replace("valve", "vlv")
            elif cpse == "CPSE_C":
                desc = "MAT: " + desc + " [REF: " + str(code_counter) + "]"
            
            rows.append({
                "cpse_code": f"{cpse}-{code_counter}",
                "description": desc,
                "uom": "EA",
                "category": "MECHANICAL"
            })
            code_counter += 1
            
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["cpse_code", "description", "uom", "category"])
            writer.writeheader()
            writer.writerows(rows)
            
    print(f"Generated 3 synthetic CPSE catalog files in {OUTPUT_DIR}")

if __name__ == "__main__":
    generate_catalogs()
