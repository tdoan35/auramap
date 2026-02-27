import os
import sys

# Add project root to path so backend modules can be imported
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Datadog instrumentation (must be before other imports)
try:
    from ddtrace import tracer, patch_all
    patch_all()
    tracer.configure(hostname="localhost", port=8126)
    DD_ENABLED = True
except ImportError:
    DD_ENABLED = False
    print("ddtrace not installed — Datadog instrumentation disabled")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.routers import health, tour
from backend.config import AUDIO_STORAGE_PATH

app = FastAPI(title="AuraMap API", version="1.0.0")

# CORS — allow all origins for hackathon
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure audio directories exist
audio_path = Path(AUDIO_STORAGE_PATH)
audio_path.mkdir(parents=True, exist_ok=True)

golden_audio_path = Path(__file__).parent / "golden_path" / "audio"
golden_audio_path.mkdir(parents=True, exist_ok=True)

# Mount static file directories
app.mount("/audio", StaticFiles(directory=str(audio_path)), name="audio")
app.mount("/golden-audio", StaticFiles(directory=str(golden_audio_path)), name="golden-audio")

# Include routers
app.include_router(health.router)
app.include_router(tour.router, prefix="/tour")


@app.get("/")
async def root():
    return {
        "app": "AuraMap API",
        "version": "1.0.0",
        "datadog": "enabled" if DD_ENABLED else "disabled",
    }
