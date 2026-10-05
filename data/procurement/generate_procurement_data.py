"""
Synthetic Procurement Data Generator for SIH 26099 (Dev 4)
Generates procurement metrics (quantities, unit prices, spend, potential pooled savings)
across CPSEs for crosswalk items.
"""

import json
import os
import random

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_procurement_records():
    random.seed(42)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    sample_records = [
        {
            "cpse_id": 1,
            "cpse_code": "CPSE_A-10001",
            "year": 2025,
            "annual_qty": 200,
            "uom": "EA",
            "last_price": 4200.0,
            "price_date": "2025-01-15",
            "stock_qty": 45,
            "is_synthetic": True
        },
        {
            "cpse_id": 2,
            "cpse_code": "CPSE_B-10001",
            "year": 2025,
            "annual_qty": 340,
            "uom": "EA",
            "last_price": 4850.0,
            "price_date": "2025-02-10",
            "stock_qty": 80,
            "is_synthetic": True
        },
        {
            "cpse_id": 3,
            "cpse_code": "CPSE_C-10001",
            "year": 2025,
            "annual_qty": 150,
            "uom": "EA",
            "last_price": 4100.0,
            "price_date": "2025-03-01",
            "stock_qty": 20,
            "is_synthetic": True
        }
    ]
    
    filepath = os.path.join(OUTPUT_DIR, "procurement_seed.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(sample_records, f, indent=2)
        
    print(f"Generated synthetic procurement seed data at {filepath}")
    return sample_records

if __name__ == "__main__":
    generate_procurement_records()
