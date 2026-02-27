import json
from backend.services.bedrock_client import invoke_claude
from backend.agent.prompts.outline_prompt import (
    OUTLINE_SYSTEM_PROMPT,
    build_outline_prompt,
)
from backend.models.tour import TourOutline, EnrichedPOI, RouteLeg


def generate_outline(
    tour_id: str,
    start_name: str,
    end_name: str,
    total_distance_m: int,
    total_duration_s: int,
    enriched_pois: list[EnrichedPOI],
    legs: list[RouteLeg],
) -> TourOutline:
    """Generate a tour outline using Bedrock Claude."""
    poi_dicts = [p.model_dump() for p in enriched_pois]
    leg_dicts = [l.model_dump() for l in legs]

    prompt = build_outline_prompt(
        tour_id=tour_id,
        start_name=start_name,
        end_name=end_name,
        total_distance_m=total_distance_m,
        total_duration_s=total_duration_s,
        enriched_pois=poi_dicts,
        legs=leg_dicts,
    )

    response_text = invoke_claude(
        prompt=prompt,
        system_prompt=OUTLINE_SYSTEM_PROMPT,
        max_tokens=2048,
    )

    # Parse JSON from response (handle potential markdown wrapping)
    json_text = response_text.strip()
    if json_text.startswith("```"):
        # Strip markdown code fences
        lines = json_text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        json_text = "\n".join(lines)

    outline_data = json.loads(json_text)
    return TourOutline(**outline_data)
