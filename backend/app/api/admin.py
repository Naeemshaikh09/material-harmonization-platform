"""
Admin Router
Developer 1: Backend Core
CRUD operations for reference data: terminology, templates, code tables, users, and CPSEs.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from ..db.database import get_db
from ..db.models import Terminology, ClassTemplate, CodeTable, CodeTableValue, AppUser, CPSE

router = APIRouter()


class TerminologyCreate(BaseModel):
    term: str
    replacement: str
    kind: str
    version: int = 1


@router.get("/terminology")
def list_terminology(db: Session = Depends(get_db)):
    terms = db.query(Terminology).filter(Terminology.active == True).all()
    return terms


@router.post("/terminology")
def add_terminology(req: TerminologyCreate, db: Session = Depends(get_db)):
    t = Terminology(
        term=req.term.upper(),
        replacement=req.replacement.upper(),
        kind=req.kind.upper(),
        version=req.version,
        active=True
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.get("/templates")
def list_templates(db: Session = Depends(get_db)):
    templates = db.query(ClassTemplate).all()
    result = []
    for t in templates:
        defn = t.definition or {}
        dims = defn.get("dimensions", {})
        if isinstance(dims, dict):
            # dimensions is {dim_name: {critical: bool, ...}}
            applicable = list(dims.keys())
            critical = [k for k, v in dims.items() if isinstance(v, dict) and v.get("critical")]
        elif isinstance(dims, list):
            applicable = dims
            critical = defn.get("critical", [])
        else:
            applicable = []
            critical = defn.get("critical", [])
        result.append({
            "id": t.id,
            "class_code": t.class_code,
            "class_name": t.class_name,
            "version": t.version,
            "status": t.status,
            "validated_by": t.validated_by,
            "applicable": applicable,
            "critical": critical,
        })
    return result


@router.get("/code-tables")
def list_code_tables(db: Session = Depends(get_db)):
    tables = db.query(CodeTable).all()
    res = []
    for t in tables:
        vals = db.query(CodeTableValue).filter(CodeTableValue.table_id == t.id).all()
        res.append({
            "name": t.name,
            "values": [
                {
                    "code": v.code,
                    "label": v.label,
                    "canonical": v.canonical,
                    "status": v.status or "ACTIVE",
                }
                for v in vals
            ]
        })
    return res


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(AppUser).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "cpse_id": u.cpse_id,
            # Frontend AdminUserRow expects 'cpse' as a string name and 'active' bool
            "cpse": f"CPSE_{u.cpse_id}" if u.cpse_id else None,
            "active": u.active if u.active is not None else True,
        }
        for u in users
    ]


@router.get("/cpses")
def list_cpses(db: Session = Depends(get_db)):
    cpses = db.query(CPSE).all()
    return cpses
