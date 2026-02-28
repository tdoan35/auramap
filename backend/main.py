import os
import sys
import asyncio
from contextlib import asynccontextmanager

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

from backend.routers import health, tour, realtime
from backend.routers import agent_router
from backend.config import AUDIO_STORAGE_PATH
from backend.services.neo4j_client import is_available as neo4j_available
from backend.agent.seed_data import seed_pois
from backend.agent.city_agent import start_agent_loop, stop_agent
from backend.agent.event_bus import EventBus


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: seed POIs + launch agent loop. Shutdown: stop agent."""
    bus = EventBus.get()
    bus.emit("system", "server_starting")

    # Seed Neo4j with SF POIs (idempotent)
    if neo4j_available():
        seed_pois()
    else:
        bus.emit("system", "neo4j_unavailable", details={
            "message": "Neo4j not connected — skipping seed, agent will retry"
        })

    # Start the autonomous agent loop as a background task
    agent_task = asyncio.create_task(start_agent_loop())
    bus.emit("system", "server_ready")

    yield

    # Shutdown
    stop_agent()
    agent_task.cancel()
    try:
        await agent_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="AuraMap API", version="1.0.0", lifespan=lifespan)

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

dashboard_path = Path(__file__).parent / "dashboard"
dashboard_path.mkdir(parents=True, exist_ok=True)

# Mount static file directories
app.mount("/audio", StaticFiles(directory=str(audio_path)), name="audio")
app.mount("/golden-audio", StaticFiles(directory=str(golden_audio_path)), name="golden-audio")

# Include routers
app.include_router(health.router)
app.include_router(tour.router, prefix="/tour")
app.include_router(realtime.router)
app.include_router(agent_router.router)

# Mount dashboard LAST (catch-all static files)
app.mount("/dashboard", StaticFiles(directory=str(dashboard_path), html=True), name="dashboard")


@app.get("/")
async def root():
    return {
        "app": "AuraMap API",
        "version": "1.0.0",
        "datadog": "enabled" if DD_ENABLED else "disabled",
        "agent": "active",
    }
