"""
Main FastAPI Application Entry Point
Developer 1: Backend Core
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.db.database import engine, Base
from app.api import auth, batches, cmc, reviews, migration, analytics, audit, admin

# Create tables if not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Material Harmonization Platform API",
    description="SIH 26099 - AI-Driven Material Code Standardization",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "Material Harmonization Platform",
        "version": "1.0.0",
        "phase": "Phase 5 - Complete Integration"
    }


@app.get("/api/v1/health")
async def health():
    return {
        "status": "ok",
        "database": "connected",
        "ml_service": "integrated"
    }


# Register all router endpoints
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(batches.router, prefix="/api/v1/batches", tags=["Batches & Ingestion"])
app.include_router(cmc.router, prefix="/api/v1/cmc", tags=["CMC Golden Records"])
app.include_router(reviews.router, prefix="/api/v1/reviews", tags=["Steward Review Workbench"])
app.include_router(migration.router, prefix="/api/v1/migration", tags=["Migration Engine"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics & Procurement"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["Tamper-Evident Audit Chain"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin & Reference Data"])


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
