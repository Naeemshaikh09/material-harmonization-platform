"""
Master Database Seed Script
Developer 1: Backend Core
Populates database with initial CPSEs, users, terminology, class templates, and code tables.
"""

import os
import json
import sys
import glob

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.database import engine, SessionLocal, Base
from app.db.models import CPSE, AppUser, Terminology, ClassTemplate, CodeTable, CodeTableValue, ProcurementRecord

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))


def seed_database():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed CPSEs
        if not db.query(CPSE).first():
            cpses = [
                CPSE(id=1, short_name="CPSE_A", full_name="Oil & Gas Exploration Corp", sector="OIL_GAS", erp_type="SAP"),
                CPSE(id=2, short_name="CPSE_B", full_name="National Refining Ltd", sector="REFINERY", erp_type="ORACLE"),
                CPSE(id=3, short_name="CPSE_C", full_name="Heavy Engineering Enterprises", sector="POWER", erp_type="SAP")
            ]
            db.add_all(cpses)
            db.commit()
            print("[OK] Seeded 3 CPSEs")

        # 2. Seed Users
        # Usernames and password ("demo") must match what the frontend Login.tsx demo buttons send.
        if not db.query(AppUser).first():
            users = [
                AppUser(username="admin1", password_hash="demo", role="ADMIN", cpse_id=None),
                AppUser(username="steward1", password_hash="demo", role="STEWARD", cpse_id=None),
                AppUser(username="approver1", password_hash="demo", role="APPROVER", cpse_id=None),
                AppUser(username="uploader1", password_hash="demo", role="UPLOADER", cpse_id=1),
                AppUser(username="auditor1", password_hash="demo", role="AUDITOR", cpse_id=None),
            ]
            db.add_all(users)
            db.commit()
            print("[OK] Seeded 5 App Users")

        # 3. Seed Terminology Dictionary
        term_path = os.path.join(DATA_DIR, "dictionaries", "terminology.json")
        if os.path.exists(term_path) and not db.query(Terminology).first():
            with open(term_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            t_objs = [
                Terminology(
                    term=e["term"],
                    replacement=e["replacement"],
                    kind=e.get("kind", "ABBREVIATION"),
                    version=e.get("version", 1),
                    active=e.get("active", True)
                )
                for e in data.get("entries", [])
            ]
            db.add_all(t_objs)
            db.commit()
            print(f"[OK] Seeded {len(t_objs)} Terminology Dictionary Entries")

        # 4. Seed Class Templates
        template_files = glob.glob(os.path.join(DATA_DIR, "templates", "*.json"))
        if template_files and not db.query(ClassTemplate).first():
            tmpl_objs = []
            for tf in template_files:
                with open(tf, "r", encoding="utf-8") as f:
                    t = json.load(f)
                tmpl_objs.append(ClassTemplate(
                    class_code=t["class_code"],
                    class_name=t["class_name"],
                    version=t.get("version", 1),
                    definition=t,
                    status="ACTIVE",
                    validated_by=t.get("validated_by")
                ))
            db.add_all(tmpl_objs)
            db.commit()
            print(f"[OK] Seeded {len(tmpl_objs)} Class Templates")

        # 5. Seed Code Tables
        ct_files = glob.glob(os.path.join(DATA_DIR, "code_tables", "*.json"))
        if ct_files and not db.query(CodeTable).first():
            for cf in ct_files:
                with open(cf, "r", encoding="utf-8") as f:
                    ct_data = json.load(f)
                ct_obj = CodeTable(name=ct_data["name"])
                db.add(ct_obj)
                db.commit()
                db.refresh(ct_obj)

                val_objs = [
                    CodeTableValue(
                        table_id=ct_obj.id,
                        code=v["code"],
                        label=v["label"],
                        canonical=v["canonical"],
                        status=v.get("status", "ACTIVE")
                    )
                    for v in ct_data.get("values", [])
                ]
                db.add_all(val_objs)
                db.commit()
            print(f"[OK] Seeded {len(ct_files)} Code Tables")

        # 6. Seed Procurement Data
        proc_path = os.path.join(DATA_DIR, "procurement", "procurement_seed.json")
        if os.path.exists(proc_path) and not db.query(ProcurementRecord).first():
            with open(proc_path, "r", encoding="utf-8") as f:
                p_data = json.load(f)
            p_objs = [
                ProcurementRecord(
                    cpse_id=p["cpse_id"],
                    cpse_code=p["cpse_code"],
                    year=p["year"],
                    annual_qty=p["annual_qty"],
                    uom=p["uom"],
                    last_price=p["last_price"],
                    price_date=p["price_date"],
                    stock_qty=p["stock_qty"],
                    is_synthetic=p.get("is_synthetic", True)
                )
                for p in p_data
            ]
            db.add_all(p_objs)
            db.commit()
            print(f"[OK] Seeded {len(p_objs)} Procurement Records")

        print(">>> DATABASE SEEDED SUCCESSFULLY <<<")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
