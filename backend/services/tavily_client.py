from tavily import TavilyClient
from backend.config import TAVILY_API_KEY


def search_poi_info(name: str, city: str = "San Francisco") -> dict:
    """Search for history, stories, and facts about a POI using Tavily."""
    client = TavilyClient(api_key=TAVILY_API_KEY)

    try:
        response = client.search(
            query=f"{name} {city} history stories interesting facts",
            max_results=3,
            search_depth="basic",
        )
    except Exception as e:
        print(f"Tavily search error for {name}: {e}")
        return {"stories": [], "history": ""}

    results = response.get("results", [])
    stories = [r.get("content", "")[:500] for r in results]
    history = " ".join(stories[:2]) if stories else ""

    return {
        "stories": stories,
        "history": history[:1000],
    }
