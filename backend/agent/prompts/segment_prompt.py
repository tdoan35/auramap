SEGMENT_SYSTEM_PROMPT = """You are a tour guide narrator for the AuraMap app. You write audio transcripts
that will be converted to speech. Write in second person ("you"). Be vivid and specific.
One story per POI, told well. Transit segments build anticipation. Your tone is warm
and conversational.

Write ONLY the transcript text. No stage directions, no headers, no metadata, no markdown.
The text will be spoken directly by a TTS voice."""

SEGMENT_USER_PROMPT_TEMPLATE = """Write the transcript for segment {segment_id} of this tour.

Tour theme: {theme}
Tour tone: {tone}
Tour arc: {arc}

This segment:
- Type: {type}
- Label: {label}
- Target word count: {target_word_count} words (IMPORTANT: stay within ±10%)
- Key themes: {key_themes}
- Transition hook: {transition_hook}
{poi_section}
{previous_section}

Write ONLY the transcript text. No stage directions, no headers, no metadata."""


def build_segment_prompt(
    segment: dict,
    outline: dict,
    enriched_poi: dict | None = None,
    previous_transcript: str | None = None,
) -> str:
    poi_section = ""
    if enriched_poi and segment.get("type") == "poi_arrival":
        poi_section = f"""
POI data:
- Name: {enriched_poi.get('name', '')}
- Description: {enriched_poi.get('description', '')}
- History: {enriched_poi.get('history', '')}
- Stories: {'; '.join(enriched_poi.get('stories', [])[:2])}
- Reviews: {enriched_poi.get('reviews_summary', '')}
- Story angle: {segment.get('story_angle', 'Choose the most compelling angle')}"""

    previous_section = ""
    if previous_transcript:
        previous_section = f"""
Previous segment transcript (maintain voice continuity):
\"{previous_transcript[:500]}\""""

    return SEGMENT_USER_PROMPT_TEMPLATE.format(
        segment_id=segment.get("segment_id", 0),
        theme=outline.get("theme", ""),
        tone=outline.get("tone", ""),
        arc=outline.get("arc", ""),
        type=segment.get("type", ""),
        label=segment.get("label", ""),
        target_word_count=segment.get("target_word_count", 150),
        key_themes=", ".join(segment.get("key_themes", [])),
        transition_hook=segment.get("transition_hook", "None"),
        poi_section=poi_section,
        previous_section=previous_section,
    )
