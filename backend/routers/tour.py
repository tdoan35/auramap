import asyncio
import json
import time
from pathlib import Path

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from backend.models.requests import TourGenerateRequest
from backend.agent.tour_agent import run_tour_pipeline
from backend.agent.event_bus import EventBus

router = APIRouter()

GOLDEN_PATH_DIR = Path(__file__).resolve().parent.parent / "golden_path"

# Set to True to force golden path (for demo recordings)
FORCE_GOLDEN_PATH = True


@router.post("/generate")
async def generate_tour(request: TourGenerateRequest):
    """Start tour generation and stream results via SSE."""
    tour_id = f"tour_{int(time.time() * 1000)}"

    bus = EventBus.get()

    async def event_generator():
        if FORCE_GOLDEN_PATH:
            print("FORCE_GOLDEN_PATH enabled — serving golden path")
            async for event in serve_golden_path():
                bus.emit_tour(event["event"], json.loads(event["data"]))
                yield event
            return

        try:
            async with asyncio.timeout(300):
                async for event in run_tour_pipeline(request, tour_id):
                    bus.emit_tour(event["event"], event["data"])
                    yield {
                        "event": event["event"],
                        "data": json.dumps(event["data"]),
                    }
        except asyncio.TimeoutError:
            print(f"Pipeline timeout after 300s, falling back to golden path")
            async for event in serve_golden_path():
                yield event
        except Exception as e:
            import traceback
            traceback.print_exc()
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

    # Emit outline event so frontend shows planned segments immediately
    segments_list = data.get("segments", [])
    yield {
        "event": "outline",
        "data": json.dumps({
            "theme": data.get("theme", "Walking Tour"),
            "segments": [
                {
                    "segment_id": s.get("segment_id", i),
                    "type": s.get("type", "transit"),
                    "label": s.get("label", f"Segment {i+1}"),
                    "estimated_duration_s": s.get("duration_s", 60),
                }
                for i, s in enumerate(segments_list)
            ],
        }),
    }

    for segment in segments_list:
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
