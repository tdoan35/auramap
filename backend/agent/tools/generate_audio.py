import asyncio
from backend.services.minimax_tts import generate_speech
from backend.services.audio_store import save_audio


async def generate_audio(
    transcript: str,
    tour_id: str,
    segment_id: int,
    voice_id: str = "English_CalmWoman",
) -> tuple[str, float]:
    """
    Generate TTS audio for a transcript and save it.
    Returns (audio_url, duration_s).
    """
    audio_bytes = await generate_speech(transcript, voice_id)
    audio_url, duration_s = save_audio(tour_id, segment_id, audio_bytes)
    return audio_url, duration_s
