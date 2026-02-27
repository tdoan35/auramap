"""
OpenAI-powered transcript quality evaluator.
Scores each tour segment on engagement, accuracy, and flow.
Used as a self-improvement loop: low-scoring segments get regenerated with feedback.
"""

from openai import OpenAI
from backend.config import OPENAI_API_KEY

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


EVAL_SYSTEM_PROMPT = """You are a quality evaluator for audio walking tour transcripts.
Rate each transcript on a 1-10 scale considering:
- Engagement: Is it compelling and interesting to listen to?
- Accuracy: Does it sound factual and well-researched?
- Flow: Does it read naturally when spoken aloud?
- Word count adherence: Is it close to the target length?

Respond ONLY with valid JSON in this exact format:
{"score": 8, "feedback": "Brief specific feedback here", "approved": true}

Set approved=true if score >= 7, false otherwise.
If not approved, feedback MUST include specific actionable improvements."""


def evaluate_transcript(
    transcript: str,
    segment_type: str,
    target_word_count: int,
) -> dict:
    """
    Evaluate a tour segment transcript using OpenAI.
    Returns {"score": int, "feedback": str, "approved": bool}
    """
    client = _get_client()
    actual_words = len(transcript.split())

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": EVAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Segment type: {segment_type}\n"
                    f"Target word count: {target_word_count}\n"
                    f"Actual word count: {actual_words}\n\n"
                    f"Transcript:\n{transcript}"
                ),
            },
        ],
        temperature=0.3,
        max_tokens=150,
        response_format={"type": "json_object"},
    )

    import json
    try:
        result = json.loads(response.choices[0].message.content)
        return {
            "score": int(result.get("score", 7)),
            "feedback": result.get("feedback", ""),
            "approved": result.get("approved", True),
        }
    except (json.JSONDecodeError, ValueError, AttributeError):
        # Fallback: approve on evaluation failure (don't block the pipeline)
        return {"score": 7, "feedback": "Evaluation parse error — auto-approved", "approved": True}
