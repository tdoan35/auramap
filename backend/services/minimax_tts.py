import httpx
from backend.config import MINIMAX_API_KEY


async def generate_speech(
    text: str,
    voice_id: str = "English_CalmWoman",
) -> bytes:
    """Generate TTS audio from text using MiniMax API. Returns MP3 bytes."""
    url = "https://api.minimaxi.chat/v1/t2a_v2"
    headers = {
        "Authorization": f"Bearer {MINIMAX_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "speech-02-hd",
        "text": text,
        "voice_setting": {
            "voice_id": voice_id,
        },
        "audio_setting": {
            "format": "mp3",
            "sample_rate": 32000,
        },
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    # MiniMax returns hex-encoded audio at data.audio
    audio_hex = data.get("data", {}).get("audio", "")
    if not audio_hex:
        raise ValueError(f"No audio data in MiniMax response: {list(data.keys())}")

    return bytes.fromhex(audio_hex)
