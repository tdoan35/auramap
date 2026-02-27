import asyncio
import json
import time
from pathlib import Path

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from backend.models.requests import TourGenerateRequest
from backend.agent.tour_agent import run_tour_pipeline

router = APIRouter()

GOLDEN_PATH_DIR = Path(__file__).resolve().parent.parent / "golden_path"


@router.post("/generate")
async def generate_tour(request: TourGenerateRequest):
    """Start tour generation and stream results via SSE."""
    tour_id = f"tour_{int(time.time() * 1000)}"

    async def event_generator():
        try:
            async with asyncio.timeout(60):
                async for event in run_tour_pipeline(request, tour_id):
                    yield {
                        "event": event["event"],
                        "data": json.dumps(event["data"]),
                    }
        except (asyncio.TimeoutError, Exception) as e:
            print(f"Pipeline error: {e}, falling back to golden path")
            async for event in serve_golden_path():
                yield event

    return EventSourceResponse(event_generator())


async def serve_golden_path():
    """Stream pre-cached golden path tour data via SSE."""
    tour_data_path = GOLDEN_PATH_DIR / "tour_data.json"

    if not tour_data_path.exists():
        yield {
            "event": "status",
            "data": json.dumps({"phase": "error", "message": "Golden path data not found"}),
        }
        return

    data = json.loads(tour_data_path.read_text())

    yield {
        "event": "status",
        "data": json.dumps({"phase": "generating_segments", "message": "Loading tour..."}),
    }

    for segment in data.get("segments", []):
        await asyncio.sleep(0.5)  # Simulate generation delay
        yield {
            "event": "segment",
            "data": json.dumps(segment),
        }

    yield {
        "event": "complete",
        "data": json.dumps({
            "tour_id": data.get("tour_id", "golden_path"),
            "total_segments": len(data.get("segments", [])),
            "total_duration_s": sum(s.get("duration_s", 0) for s in data.get("segments", [])),
        }),
    }
