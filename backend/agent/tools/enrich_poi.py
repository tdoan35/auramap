import asyncio
from backend.services.google_places import get_place_details
from backend.services.tavily_client import search_poi_info
from backend.services.neo4j_client import get_poi_knowledge, store_poi_knowledge, is_available as neo4j_available
from backend.models.tour import EnrichedPOI, POI


async def enrich_poi(poi: POI) -> tuple[EnrichedPOI, dict | None]:
    """
    Enrich a POI with Google Places Details and Tavily search data.
    Checks Neo4j knowledge graph first for cached data.
    Returns (enriched_poi, reasoning_event_or_none).
    """
    loop = asyncio.get_event_loop()
    reasoning = None

    # Check Neo4j cache first
    if neo4j_available():
        cached = await loop.run_in_executor(None, get_poi_knowledge, poi.name)
        if cached:
            reasoning = {
                "agent": "researcher",
                "message": f"Found {poi.name} in knowledge graph — skipping web search",
            }
            return EnrichedPOI(
                place_id=poi.place_id,
                name=poi.name,
                lat=poi.lat,
                lng=poi.lng,
                types=poi.types,
                rating=poi.rating,
                description=cached.get("description", ""),
                history=cached.get("history", ""),
                stories=cached.get("stories", []),
                reviews_summary=cached.get("reviews_summary", ""),
            ), reasoning

    # Run Google Places and Tavily in parallel
    places_task = get_place_details(poi.place_id)
    # Tavily is synchronous, wrap in executor
    tavily_task = loop.run_in_executor(None, search_poi_info, poi.name)

    places_data, tavily_data = await asyncio.gather(
        places_task, tavily_task, return_exceptions=True
    )

    if isinstance(places_data, Exception):
        places_data = {}
    if isinstance(tavily_data, Exception):
        tavily_data = {"stories": [], "history": ""}

    enriched = EnrichedPOI(
        place_id=poi.place_id,
        name=poi.name,
        lat=poi.lat,
        lng=poi.lng,
        types=poi.types,
        rating=poi.rating,
        description=places_data.get("description", ""),
        history=tavily_data.get("history", ""),
        stories=tavily_data.get("stories", []),
        reviews_summary=places_data.get("reviews_summary", ""),
    )

    # Store in Neo4j for future tours
    if neo4j_available():
        await loop.run_in_executor(None, store_poi_knowledge, poi.name, enriched.model_dump())
        reasoning = {
            "agent": "researcher",
            "message": f"Enriched {poi.name} via Tavily + Google Places — stored in knowledge graph",
        }
    else:
        reasoning = {
            "agent": "researcher",
            "message": f"Enriched {poi.name} via Tavily real-time search + Google Places",
        }

    return enriched, reasoning


async def enrich_all_pois(pois: list[POI]) -> tuple[list[EnrichedPOI], list[dict]]:
    """Enrich all POIs in parallel. Returns (enriched_pois, reasoning_events)."""
    tasks = [enrich_poi(poi) for poi in pois]
    results = await asyncio.gather(*tasks)
    enriched = [r[0] for r in results]
    reasoning = [r[1] for r in results if r[1] is not None]
    return enriched, reasoning
