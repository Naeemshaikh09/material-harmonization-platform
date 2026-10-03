"""
Main FastAPI Application Entry Point
Developer 1: Backend Core
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# TODO: Import routers after Phase 1
# from app.api import auth, batches, cmc, reviews, analytics, admin

app = FastAPI(
    title="Material Harmonization Platform API",
    description="SIH 26099 - AI-Driven Material Code Standardization",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Material Harmonization Platform",
        "version": "0.1.0",
        "phase": "Phase 0 - Setup",
    }


@app.get("/api/v1/health")
async def health():
    """API health check"""
    return {
        "status": "ok",
        "database": "not_connected",  # TODO: Check DB connection
        "ml_service": "not_connected",  # TODO: Check ML service
    }


# TODO Phase 1: Add authentication routes
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])

# TODO Phase 1: Add batch ingestion routes
# app.include_router(batches.router, prefix="/api/v1/batches", tags=["batches"])

# TODO Phase 2: Add CMC routes
# app.include_router(cmc.router, prefix="/api/v1/cmc", tags=["cmc"])

# TODO Phase 3: Add review routes
# app.include_router(reviews.router, prefix="/api/v1/reviews", tags=["reviews"])

# TODO Phase 4: Add analytics routes
# app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])

# TODO Phase 4: Add admin routes
# app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
