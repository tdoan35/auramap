from backend.services.bedrock_client import invoke_claude
from backend.agent.prompts.segment_prompt import (
    SEGMENT_SYSTEM_PROMPT,
    build_segment_prompt,
)


def generate_segment(
    segment: dict,
    outline: dict,
    enriched_poi: dict | None = None,
    previous_transcript: str | None = None,
) -> str:
    """Generate a segment transcript using Bedrock Claude."""
    prompt = build_segment_prompt(
        segment=segment,
        outline=outline,
        enriched_poi=enriched_poi,
        previous_transcript=previous_transcript,
    )

    transcript = invoke_claude(
        prompt=prompt,
        system_prompt=SEGMENT_SYSTEM_PROMPT,
        max_tokens=1024,
    )

    return transcript.strip()
