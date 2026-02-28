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


def get_all_pois() -> list[dict]:
    """Get all POI nodes with metadata. Returns list of dicts."""
    driver = _get_driver()
    if not driver:
        return []
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (p:POI)
                OPTIONAL MATCH (p)-[:HAS_VERSION]->(v:POIVersion)
                WITH p, count(v) as version_count
                RETURN p, version_count
                ORDER BY p.name
                """
            )
            pois = []
            for record in result:
                node = record["p"]
                updated_at = node.get("updated_at")
                # Convert neo4j datetime to epoch float
                epoch = updated_at.to_native().timestamp() if updated_at else 0
                pois.append({
                    "name": node.get("name", ""),
                    "description": node.get("description", ""),
                    "history": node.get("history", ""),
                    "stories": json.loads(node.get("stories", "[]")),
                    "reviews_summary": node.get("reviews_summary", ""),
                    "rating": node.get("rating"),
                    "types": json.loads(node.get("types", "[]")),
                    "narrative": node.get("narrative", ""),
                    "quality_score": node.get("quality_score", 0),
                    "version": node.get("version", 1),
                    "updated_at": epoch,
                    "version_count": record["version_count"],
                })
            return pois
    except Exception as e:
        print(f"Neo4j get_all_pois error: {e}")
        return []


def store_poi_knowledge_versioned(poi_name: str, new_data: dict) -> bool:
    """Archive current POI state to a POIVersion node, then update POI with new data."""
    driver = _get_driver()
    if not driver:
        return False
    try:
        with driver.session() as session:
            session.run(
                """
                MATCH (p:POI {name: $name})
                CREATE (v:POIVersion {
                    name: p.name,
                    description: p.description,
                    history: p.history,
                    stories: p.stories,
                    narrative: COALESCE(p.narrative, ''),
                    quality_score: COALESCE(p.quality_score, 0),
                    version: COALESCE(p.version, 1),
                    archived_at: datetime()
                })
                CREATE (p)-[:HAS_VERSION]->(v)
                SET p.description = $description,
                    p.history = $history,
                    p.stories = $stories,
                    p.narrative = $narrative,
                    p.quality_score = $quality_score,
                    p.version = COALESCE(p.version, 1) + 1,
                    p.updated_at = datetime()
                """,
                name=poi_name,
                description=new_data.get("description", ""),
                history=new_data.get("history", ""),
                stories=json.dumps(new_data.get("stories", [])),
                narrative=new_data.get("narrative", ""),
                quality_score=new_data.get("quality_score", 0),
            )
        return True
    except Exception as e:
        print(f"Neo4j versioned store error for {poi_name}: {e}")
        return False


def get_poi_with_versions(poi_name: str) -> dict | None:
    """Get a POI and its version history."""
    driver = _get_driver()
    if not driver:
        return None
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (p:POI {name: $name})
                OPTIONAL MATCH (p)-[:HAS_VERSION]->(v:POIVersion)
                RETURN p, collect(v {.*, archived_at: toString(v.archived_at)}) as versions
                ORDER BY v.version DESC
                """,
                name=poi_name,
            )
            record = result.single()
            if not record:
                return None
            node = record["p"]
            updated_at = node.get("updated_at")
            epoch = updated_at.to_native().timestamp() if updated_at else 0
            return {
                "name": node.get("name", ""),
                "description": node.get("description", ""),
                "history": node.get("history", ""),
                "stories": json.loads(node.get("stories", "[]")),
                "narrative": node.get("narrative", ""),
                "quality_score": node.get("quality_score", 0),
                "version": node.get("version", 1),
                "updated_at": epoch,
                "versions": [dict(v) for v in record["versions"]],
            }
    except Exception as e:
        print(f"Neo4j get_poi_with_versions error for {poi_name}: {e}")
        return None


def get_knowledge_graph_stats() -> dict:
    """Get aggregate stats: poi_count, avg_quality_score, total_versions."""
    driver = _get_driver()
    if not driver:
        return {"poi_count": 0, "avg_quality_score": 0, "total_versions": 0}
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (p:POI)
                OPTIONAL MATCH (p)-[:HAS_VERSION]->(v:POIVersion)
                WITH count(DISTINCT p) as poi_count,
                     avg(COALESCE(p.quality_score, 0)) as avg_score,
                     count(v) as total_versions
                RETURN poi_count, avg_score, total_versions
                """
            )
            record = result.single()
            return {
                "poi_count": record["poi_count"],
                "avg_quality_score": round(record["avg_score"], 1),
                "total_versions": record["total_versions"],
            }
    except Exception as e:
        print(f"Neo4j stats error: {e}")
        return {"poi_count": 0, "avg_quality_score": 0, "total_versions": 0}
