import httpx
from backend.config import GOOGLE_MAPS_API_KEY


async def get_place_details(place_id: str) -> dict:
    """Fetch detailed info about a POI from Google Places Details API."""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,editorial_summary,reviews,rating,formatted_address,types",
        "key": GOOGLE_MAPS_API_KEY,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, params=params)
        data = response.json()

    if data.get("status") != "OK":
        return {}

    result = data.get("result", {})

    # Extract key info
    reviews = result.get("reviews", [])
    reviews_text = " | ".join(
        r.get("text", "")[:200] for r in reviews[:3]
    )

    return {
        "name": result.get("name", ""),
        "description": result.get("editorial_summary", {}).get("overview", ""),
        "rating": result.get("rating"),
        "address": result.get("formatted_address", ""),
        "reviews_summary": reviews_text,
        "types": result.get("types", []),
    }
