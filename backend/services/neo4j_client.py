"""
Neo4j knowledge graph client for POI data caching.
Stores enriched POI data as graph nodes so subsequent tours in the same area
can skip web research and serve cached knowledge instantly.
Graceful fallback if Neo4j is unavailable — never breaks the pipeline.
"""

import json
from backend.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

_driver = None
_available = None


def _get_driver():
    global _driver, _available
    if _available is False:
        return None
    if _driver is not None:
        return _driver
    if not NEO4J_URI or not NEO4J_PASSWORD:
        _available = False
        print("Neo4j: No credentials configured — knowledge graph disabled")
        return None
    try:
        from neo4j import GraphDatabase
        _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        _driver.verify_connectivity()
        _available = True
        print(f"Neo4j: Connected to {NEO4J_URI}")
        return _driver
    except Exception as e:
        _available = False
        print(f"Neo4j: Connection failed ({e}) — knowledge graph disabled")
        return None


def store_poi_knowledge(poi_name: str, enriched_data: dict) -> bool:
    """Store enriched POI data as a graph node. Returns True on success."""
    driver = _get_driver()
    if not driver:
        return False
    try:
        with driver.session() as session:
            session.run(
                """
                MERGE (p:POI {name: $name})
                SET p.description = $description,
                    p.history = $history,
                    p.stories = $stories,
                    p.reviews_summary = $reviews_summary,
                    p.rating = $rating,
                    p.types = $types,
                    p.updated_at = datetime()
                """,
                name=poi_name,
                description=enriched_data.get("description", ""),
                history=enriched_data.get("history", ""),
                stories=json.dumps(enriched_data.get("stories", [])),
                reviews_summary=enriched_data.get("reviews_summary", ""),
                rating=enriched_data.get("rating"),
                types=json.dumps(enriched_data.get("types", [])),
            )
        return True
    except Exception as e:
        print(f"Neo4j store error for {poi_name}: {e}")
        return False


def get_poi_knowledge(poi_name: str) -> dict | None:
    """Retrieve cached POI data from the knowledge graph. Returns None on miss."""
    driver = _get_driver()
    if not driver:
        return None
    try:
        with driver.session() as session:
            result = session.run(
                "MATCH (p:POI {name: $name}) RETURN p",
                name=poi_name,
            )
            record = result.single()
            if not record:
                return None
            node = record["p"]
            return {
                "description": node.get("description", ""),
                "history": node.get("history", ""),
                "stories": json.loads(node.get("stories", "[]")),
                "reviews_summary": node.get("reviews_summary", ""),
                "rating": node.get("rating"),
                "types": json.loads(node.get("types", "[]")),
            }
    except Exception as e:
        print(f"Neo4j read error for {poi_name}: {e}")
        return None


def is_available() -> bool:
    """Check if Neo4j is configured and connected."""
    _get_driver()
    return _available is True
