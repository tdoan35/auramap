from backend.services.bedrock_client import invoke_claude
from backend.agent.prompts.segment_prompt import (
    SEGMENT_SYSTEM_PROMPT,
    build_segment_prompt,
)

# Max words per segment type — keeps audio under ~2 minutes each
MAX_WORDS_BY_TYPE = {
    "opening": 120,
    "transit": 250,
    "poi_arrival": 200,
    "outro": 120,
}
DEFAULT_MAX_WORDS = 200


def _truncate_to_word_limit(text: str, max_words: int) -> str:
    """Truncate text to max_words at the nearest sentence boundary."""
    words = text.split()
    if len(words) <= max_words:
        return text

    truncated = " ".join(words[:max_words])
    # Try to end at a sentence boundary
    last_period = truncated.rfind(".")
    last_exclaim = truncated.rfind("!")
    last_question = truncated.rfind("?")
    last_sentence_end = max(last_period, last_exclaim, last_question)

    # Only use sentence boundary if it keeps at least 60% of the content
    if last_sentence_end > len(truncated) * 0.6:
        return truncated[: last_sentence_end + 1]
    return truncated + "."


def generate_segment(
    segment: dict,
    outline: dict,
    enriched_poi: dict | None = None,
    previous_transcript: str | None = None,
) -> str:
    """Generate a segment transcript using Fastino Llama 3.3 70B."""
    seg_type = segment.get("type", "transit")
    hard_max = MAX_WORDS_BY_TYPE.get(seg_type, DEFAULT_MAX_WORDS)

    # Cap the target to our hard max — the outline may request more
    target_words = min(segment.get("target_word_count", 150), hard_max)
    segment = {**segment, "target_word_count": target_words}

    # Cap max_tokens to prevent runaway generation
    # ~1.5 tokens per word with a little headroom
    max_tokens = int(target_words * 2)

    prompt = build_segment_prompt(
        segment=segment,
        outline=outline,
        enriched_poi=enriched_poi,
        previous_transcript=previous_transcript,
    )

    transcript = invoke_claude(
        prompt=prompt,
        system_prompt=SEGMENT_SYSTEM_PROMPT,
        max_tokens=max_tokens,
    )

    transcript = transcript.strip()

    # Hard truncation safety net — 15% over hard max
    max_allowed = int(hard_max * 1.15)
    word_count = len(transcript.split())
    if word_count > max_allowed:
        print(f"Segment {segment.get('segment_id')}: truncating {word_count} → {max_allowed} words")
        transcript = _truncate_to_word_limit(transcript, max_allowed)

    return transcript
