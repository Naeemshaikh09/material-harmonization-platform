"""
Database Connection & Session Setup (Supabase & PostgreSQL Enabled)
Developer 1: Backend Core
"""

import os
import re
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load .env file from project root or working directory
load_dotenv()

# Check SUPABASE_DATABASE_URL first, then DATABASE_URL, with local SQLite fallback
DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL") or "sqlite:///./material_platform.db"

# Handle 'postgres://' prefix produced by Heroku / Supabase connection strings
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

# Auto-fix unencoded '@' in passwords (e.g. postgres.user:pass@word@host -> pass%40word)
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgresql+psycopg2://"):
    # Ensure psycopg2 driver scheme is explicitly specified
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

    m = re.match(r"^(postgresql\+psycopg2://[^:]+:)(.+)(@[^@]+:\d+/.+)$", DATABASE_URL)
    if m:
        prefix, pwd, suffix = m.groups()
        # If password contains unencoded '@'
        if "@" in pwd:
            pwd = pwd.replace("@", "%40")
            DATABASE_URL = f"{prefix}{pwd}{suffix}"

connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs["connect_args"] = connect_args
else:
    # Supabase / PostgreSQL specific connection options
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
