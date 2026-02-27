import os
from pathlib import Path
from mutagen.mp3 import MP3
from backend.config import AUDIO_STORAGE_PATH


def save_audio(tour_id: str, segment_id: int, audio_bytes: bytes) -> tuple[str, float]:
    """
    Save MP3 bytes to disk and return (relative URL path, duration in seconds).
    """
    tour_dir = Path(AUDIO_STORAGE_PATH) / tour_id
    tour_dir.mkdir(parents=True, exist_ok=True)

    filename = f"segment_{segment_id}.mp3"
    filepath = tour_dir / filename

    filepath.write_bytes(audio_bytes)

    # Calculate duration
    try:
        audio = MP3(str(filepath))
        duration_s = audio.info.length
    except Exception:
        # Fallback: estimate from file size (128kbps MP3 ~ 16KB/s)
        duration_s = len(audio_bytes) / 16000

    url_path = f"/audio/{tour_id}/{filename}"
    return url_path, round(duration_s, 1)
