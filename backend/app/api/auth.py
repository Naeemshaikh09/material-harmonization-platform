"""
Authentication & RBAC Router
Developer 1: Backend Core
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..db.models import AppUser, CPSE

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    cpse_id: Optional[int] = None


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AppUser).filter(AppUser.username == req.username).first()
    if not user or user.password_hash != req.password:  # Simplified hash check for dev/demo
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    return LoginResponse(
        access_token=f"fake-jwt-token-for-{user.username}",
        role=user.role,
        username=user.username,
        cpse_id=user.cpse_id
    )


@router.get("/me")
def get_current_user_info(username: str = "admin", db: Session = Depends(get_db)):
    user = db.query(AppUser).filter(AppUser.username == username).first()
    if not user:
        return {"username": username, "role": "ADMIN", "cpse_id": 1}
    return {"username": user.username, "role": user.role, "cpse_id": user.cpse_id}
