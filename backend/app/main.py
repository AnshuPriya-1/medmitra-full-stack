import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import analyze, health
from app.routes.multi_prescription import router as multi_router

# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Medmitra – Prescription Intelligence System",
    description=(
        "FastAPI backend that parses prescriptions and returns structured "
        "medication data using Gemini Vision + AI analysis."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS – allow frontend (local dev + production Vercel URL)
# ---------------------------------------------------------------------------

# You can add more origins as a comma-separated env var:
# ALLOWED_ORIGINS=https://medmitra.vercel.app,https://yourcustomdomain.com
extra_origins = os.getenv("ALLOWED_ORIGINS", "")
extra_list = [o.strip() for o in extra_origins.split(",") if o.strip()]

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    *extra_list,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(health.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(multi_router, prefix="/api")

# ---------------------------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": "Medmitra API is running. Visit /docs for the interactive API reference.",
        "docs": "/docs",
        "health": "/api/health",
        "analyze": "POST /api/analyze",
        "multi_analyze": "POST /api/analyze-multiple"
    }
