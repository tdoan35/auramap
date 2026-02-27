OUTLINE_SYSTEM_PROMPT = """You are a creative tour guide narrative planner. You design compelling, coherent
audio walking tour outlines for the AuraMap app. Your outlines are structured JSON that
will guide transcript generation for each segment.

You must return ONLY valid JSON with no additional text or markdown formatting."""

OUTLINE_USER_PROMPT_TEMPLATE = """Create a tour outline for this walking route:

Route: {start_name} → {end_name}
Total distance: {total_distance_m}m, estimated walk time: {total_duration_s}s
Number of legs: {num_legs}

Selected points of interest:
{poi_details}

Leg details:
{leg_details}

Requirements:
- Generate a JSON outline following this exact schema:
{{
  "tour_id": "{tour_id}",
  "theme": "a connecting thread across all POIs and the route",
  "tone": "warm, curious, conversational — like a knowledgeable friend",
  "arc": "narrative arc in 3 words (e.g., Discovery → awe → reflection)",
  "segments": [
    {{
      "segment_id": 1,
      "type": "opening",
      "label": "Welcome to Your Tour",
      "target_duration_s": 30,
      "target_word_count": 75,
      "key_themes": ["theme1", "theme2"],
      "transition_hook": "hook to next segment"
    }},
    // ... more segments (transit, poi_arrival, outro)
  ]
}}
- Each segment must have key_themes and a transition_hook to the next segment
- Transit segments should fill ~85% of walking time
- Target word counts are calculated from walk times at 150 words/minute
- Story angles for POIs: pick ONE compelling story per POI, not a list of facts
- Include a "poi_name" field for poi_arrival segments
- Include a "story_angle" field for poi_arrival segments
- POI arrival segments should be 60-90 seconds
- Opening should be 30-45 seconds
- The outro segment covers the final stretch + farewell"""


def build_outline_prompt(
    tour_id: str,
    start_name: str,
    end_name: str,
    total_distance_m: int,
    total_duration_s: int,
    enriched_pois: list[dict],
    legs: list[dict],
) -> str:
    poi_details = "\n".join(
        f"- {p.get('name', 'Unknown')}: {p.get('description', '')} "
        f"History: {p.get('history', '')[:300]} "
        f"Rating: {p.get('rating', 'N/A')}"
        for p in enriched_pois
    )

    leg_details = "\n".join(
        f"- {l.get('start_name', '?')} → {l.get('end_name', '?')}: "
        f"{l.get('distance_m', 0)}m, {l.get('duration_s', 0)}s walk"
        for l in legs
    )

    return OUTLINE_USER_PROMPT_TEMPLATE.format(
        start_name=start_name,
        end_name=end_name,
        total_distance_m=total_distance_m,
        total_duration_s=total_duration_s,
        num_legs=len(legs),
        poi_details=poi_details or "No POIs selected (direct route)",
        leg_details=leg_details,
        tour_id=tour_id,
    )
