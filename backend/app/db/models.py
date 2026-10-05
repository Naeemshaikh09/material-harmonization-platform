"""
SQLAlchemy Models for Material Harmonization Platform
Developer 1: Backend Core
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
    Numeric, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base


class CPSE(Base):
    __tablename__ = "cpse"

    id = Column(Integer, primary_key=True, index=True)
    short_name = Column(String(50), unique=True, nullable=False)
    full_name = Column(Text, nullable=True)
    sector = Column(String(100), nullable=True)
    erp_type = Column(String(50), nullable=True)
    active = Column(Boolean, default=True)


class AppUser(Base):
    __tablename__ = "app_user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)  # UPLOADER, STEWARD, APPROVER, ADMIN, AUDITOR
    cpse_id = Column(Integer, ForeignKey("cpse.id"), nullable=True)
    active = Column(Boolean, default=True)

    cpse = relationship("CPSE")


class Terminology(Base):
    __tablename__ = "terminology"

    id = Column(Integer, primary_key=True, index=True)
    term = Column(Text, nullable=False)
    replacement = Column(Text, nullable=False)
    kind = Column(String(30), nullable=False)  # ABBREVIATION, UNIT, RATING, MATERIAL, SYNONYM
    version = Column(Integer, nullable=False, default=1)
    active = Column(Boolean, default=True)


class ClassTemplate(Base):
    __tablename__ = "class_template"

    id = Column(Integer, primary_key=True, index=True)
    class_code = Column(String(10), nullable=False)
    class_name = Column(String(100), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    definition = Column(JSON, nullable=False)
    validated_by = Column(Text, nullable=True)
    status = Column(String(20), default="ACTIVE")  # DRAFT, ACTIVE, RETIRED


class CodeTable(Base):
    __tablename__ = "code_table"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    values = relationship("CodeTableValue", back_populates="code_table")


class CodeTableValue(Base):
    __tablename__ = "code_table_value"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("code_table.id"), nullable=False)
    code = Column(String(10), nullable=False)
    label = Column(Text, nullable=False)
    canonical = Column(Text, nullable=False)
    status = Column(String(20), default="ACTIVE")

    code_table = relationship("CodeTable", back_populates="values")


class IngestBatch(Base):
    __tablename__ = "ingest_batch"

    id = Column(Integer, primary_key=True, index=True)
    cpse_id = Column(Integer, ForeignKey("cpse.id"), nullable=False)
    filename = Column(Text, nullable=True)
    mode = Column(String(20), default="BULK")  # BULK, MIGRATION, SINGLE
    status = Column(String(20), default="QUEUED")  # QUEUED, RUNNING, DONE, FAILED
    total_rows = Column(Integer, default=0)
    counts = Column(JSON, default={})
    created_by = Column(Integer, ForeignKey("app_user.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RawRecord(Base):
    __tablename__ = "raw_record"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("ingest_batch.id"), nullable=True)
    cpse_id = Column(Integer, ForeignKey("cpse.id"), nullable=False)
    cpse_code = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    uom = Column(String(20), nullable=True)
    extra = Column(JSON, default={})
    row_hash = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CanonicalRecord(Base):
    __tablename__ = "canonical_record"

    id = Column(Integer, primary_key=True, index=True)
    raw_id = Column(Integer, ForeignKey("raw_record.id"), unique=True, nullable=False)
    class_code = Column(String(10), nullable=True)
    subclass_code = Column(String(10), nullable=True)
    attributes = Column(JSON, nullable=False)
    canonical_key = Column(Text, nullable=True)
    completeness = Column(String(20), nullable=True)  # COMPLETE, INCOMPLETE
    min_confidence = Column(Numeric(4, 3), nullable=True)
    cleaner_version = Column(Integer, default=1)
    model_version = Column(String(50), nullable=True)
    template_version = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CMC(Base):
    __tablename__ = "cmc"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    class_code = Column(String(10), nullable=False)
    subclass_code = Column(String(10), nullable=False)
    canonical_key = Column(Text, nullable=False)
    attributes = Column(JSON, nullable=False)
    description_short = Column(Text, nullable=True)
    description_long = Column(Text, nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, SUPERSEDED
    superseded_by = Column(Integer, ForeignKey("cmc.id"), nullable=True)
    template_version = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CMCSerial(Base):
    __tablename__ = "cmc_serial"

    prefix = Column(String(100), primary_key=True)
    last_serial = Column(Integer, nullable=False, default=0)


class Crosswalk(Base):
    __tablename__ = "crosswalk"

    id = Column(Integer, primary_key=True, index=True)
    cpse_id = Column(Integer, ForeignKey("cpse.id"), nullable=False)
    cpse_code = Column(String(100), nullable=False)
    cmc_id = Column(Integer, ForeignKey("cmc.id"), nullable=True)
    raw_id = Column(Integer, ForeignKey("raw_record.id"), nullable=True)
    relationship = Column(String(20), nullable=False)  # EXACT, POTENTIAL, PENDING
    decision_source = Column(String(20), nullable=False)  # AUTO, HUMAN
    evidence = Column(JSON, nullable=True)
    version = Column(Integer, default=1)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ReviewTask(Base):
    __tablename__ = "review_task"

    id = Column(Integer, primary_key=True, index=True)
    raw_id = Column(Integer, ForeignKey("raw_record.id"), nullable=False)
    candidate_cmc = Column(Integer, ForeignKey("cmc.id"), nullable=True)
    reason = Column(String(30), nullable=False)  # INCOMPLETE, LOW_CONFIDENCE, CONFLICT, FUNCTIONAL_EQUIV
    priority = Column(Integer, default=0)
    comparison = Column(JSON, nullable=True)
    level = Column(String(5), default="L1")  # L1, L2
    status = Column(String(20), default="OPEN")  # OPEN, DONE
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ReviewDecision(Base):
    __tablename__ = "review_decision"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("review_task.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("app_user.id"), nullable=False)
    action = Column(String(20), nullable=False)  # APPROVE, REJECT, CORRECT, NEW
    corrections = Column(JSON, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class MigrationBatch(Base):
    __tablename__ = "migration_batch"

    id = Column(Integer, primary_key=True, index=True)
    cpse_id = Column(Integer, ForeignKey("cpse.id"), nullable=False)
    category = Column(String(50), nullable=True)
    status = Column(String(30), default="EXTRACTED")  # EXTRACTED, DRY_RUN, IN_REVIEW, PUBLISHED, VERIFIED, ROLLED_BACK
    report = Column(JSON, nullable=True)
    crosswalk_version = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ProcurementRecord(Base):
    __tablename__ = "procurement_record"

    id = Column(Integer, primary_key=True, index=True)
    cpse_id = Column(Integer, ForeignKey("cpse.id"), nullable=False)
    cpse_code = Column(String(100), nullable=False)
    year = Column(Integer, nullable=True)
    annual_qty = Column(Numeric, nullable=True)
    uom = Column(String(20), nullable=True)
    last_price = Column(Numeric, nullable=True)
    price_date = Column(String(20), nullable=True)
    stock_qty = Column(Numeric, nullable=True)
    is_synthetic = Column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    ts = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    actor = Column(String(50), nullable=True)
    action = Column(String(50), nullable=False)
    entity = Column(String(50), nullable=True)
    entity_id = Column(String(50), nullable=True)
    before = Column(JSON, nullable=True)
    after = Column(JSON, nullable=True)
    evidence = Column(JSON, nullable=True)
    prev_hash = Column(Text, nullable=True)
    hash = Column(Text, nullable=False)


class AuditAnchor(Base):
    __tablename__ = "audit_anchor"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audit_log.id"), nullable=False)
    hash = Column(Text, nullable=False)
    anchored_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    location = Column(Text, nullable=True)

