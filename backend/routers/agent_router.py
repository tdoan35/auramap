"""
Agent dashboard API routes:
- GET /agent/feed — SSE stream of agent events
- GET /agent/stats — JSON stats
- GET /agent/pois — All POIs with knowledge data
- GET /agent/pois/{name} — POI detail with version history
"""

import asyncio
import json
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from backend.agent.event_bus import EventBus
from backend.services.neo4j_client import (
    get_all_pois,
    get_poi_with_versions,
    get_knowledge_graph_stats,
)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/feed")
async def agent_feed(request: Request):
    """SSE endpoint: sends event history burst, then live stream."""
    bus = EventBus.get()

    async def event_generator():
        # Send history burst first
        for event in bus.get_history():
            if await request.is_disconnected():
                return
            yield {
                "event": "agent_event",
                "data": json.dumps(event),
            }

        # Then stream live events
        queue = bus.subscribe()
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                    yield {
                        "event": "agent_event",
                        "data": json.dumps(event.to_dict()),
                    }
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield {"event": "ping", "data": ""}
        finally:
            bus.unsubscribe(queue)

    return EventSourceResponse(event_generator())


@router.get("/tour-feed")
async def tour_feed(request: Request):
    """SSE endpoint: sends tour event history burst, then live stream."""
    bus = EventBus.get()

    async def event_generator():
        # Send history burst first
        for event in bus.get_tour_history():
            if await request.is_disconnected():
                return
            yield {
                "event": "tour_event",
                "data": json.dumps(event),
            }

        # Then stream live events
        queue = bus.subscribe_tours()
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                    yield {
                        "event": "tour_event",
                        "data": json.dumps(event.to_dict()),
                    }
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield {"event": "ping", "data": ""}
        finally:
            bus.unsubscribe_tours(queue)

    return EventSourceResponse(event_generator())


@router.get("/stats")
async def agent_stats():
    """Dashboard header stats: event counts + Neo4j knowledge graph stats."""
    bus = EventBus.get()
    event_stats = bus.get_stats()
    kg_stats = get_knowledge_graph_stats()
    return {**event_stats, **kg_stats}


@router.get("/pois")
async def agent_pois():
    """All POIs with knowledge data for the dashboard grid."""
    return get_all_pois()


@router.get("/pois/{name}")
async def agent_poi_detail(name: str):
    """POI detail with version history."""
    poi = get_poi_with_versions(name)
    if not poi:
        return {"error": "POI not found"}
    return poi
