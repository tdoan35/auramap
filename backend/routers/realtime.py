"""Voice Q&A endpoint — Whisper STT + GPT-4o + MiniMax TTS."""

import os
import uuid
import httpx
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from typing import Optional

from backend.config import OPENAI_API_KEY, MINIMAX_API_KEY, ELEVENLABS_API_KEY, AUDIO_STORAGE_PATH

router = APIRouter(prefix="/realtime", tags=["realtime"])


@router.post("/ask")
async def ask_voice_question(
    audio: UploadFile = File(...),
    current_segment_label: Optional[str] = Form(None),
    current_transcript: Optional[str] = Form(None),
    nearby_pois: Optional[str] = Form(None),  # comma-separated
):
    """Accept recorded audio, transcribe with Whisper, answer with GPT-4o, TTS with MiniMax."""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    audio_bytes = await audio.read()

    # 1. Transcribe with Whisper
    async with httpx.AsyncClient(timeout=15.0) as client:
        whisper_resp = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            files={"file": ("recording.m4a", audio_bytes, "audio/m4a")},
            data={"model": "whisper-1"},
        )

    if whisper_resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Whisper error: {whisper_resp.text}")

    question = whisper_resp.json().get("text", "")
    print(f"[PTT-BE] Transcribed question: {question}")
    if not question.strip():
        return {"question": "", "answer": "I didn't catch that. Could you try again?", "audio_url": None}

    # Demo shortcut: pre-cached "nearby" response
    if "nearby" in question.lower():
        demo_answer = (
            "Great question! You're right in the heart of San Francisco's Financial District, "
            "near 525 Market Street. Just steps away, you've got the iconic Ferry Building with "
            "its artisan food market along the Embarcadero. There's also the Salesforce Transit "
            "Center rooftop park, a beautiful urban oasis with gardens and walking paths above the "
            "city. If you head down Market Street, you'll pass by the historic Palace Hotel and the "
            "San Francisco Museum of Modern Art is just a few blocks south on Third Street. The "
            "neighborhood is buzzing with tech companies, great coffee shops, and street performers "
            "— there's always something happening around here!"
        )
        print("[PTT-BE] Serving pre-cached nearby demo response")
        return {
            "question": question,
            "answer": demo_answer,
            "audio_url": "/audio/ptt_demo_nearby.mp3",
        }

    # 2. Build context-aware prompt
    system_parts = [
        "You are AuraMap's voice assistant during a walking tour in San Francisco.",
        "Keep answers concise (2-3 sentences) since the user is walking.",
    ]
    if current_segment_label:
        system_parts.append(f"The user is currently at: {current_segment_label}.")
    if current_transcript:
        snippet = current_transcript[-500:]
        system_parts.append(f"Recent tour narration: ...{snippet}")
    if nearby_pois:
        system_parts.append(f"Nearby points of interest: {nearby_pois}.")

    # 3. Answer with GPT-4o
    async with httpx.AsyncClient(timeout=15.0) as client:
        chat_resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": " ".join(system_parts)},
                    {"role": "user", "content": question},
                ],
                "max_tokens": 200,
            },
        )

    if chat_resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"GPT-4o error: {chat_resp.text}")

    answer = chat_resp.json()["choices"][0]["message"]["content"]

    # 4. TTS with MiniMax (optional — skip if no key)
    audio_url = None
    print(f"[PTT-BE] MINIMAX_API_KEY present: {bool(MINIMAX_API_KEY)}, length: {len(MINIMAX_API_KEY)}")
    if MINIMAX_API_KEY:
        try:
            print(f"[PTT-BE] Calling MiniMax TTS...")
            async with httpx.AsyncClient(timeout=15.0) as client:
                tts_resp = await client.post(
                    "https://api.minimaxi.chat/v1/t2a_v2",
                    headers={
                        "Authorization": f"Bearer {MINIMAX_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "speech-02-hd",
                        "text": answer,
                        "voice_setting": {
                            "voice_id": "English_CalmWoman",
                            "speed": 1.0,
                            "vol": 1.0,
                            "pitch": 0,
                        },
                        "audio_setting": {
                            "sample_rate": 32000,
                            "bitrate": 128000,
                            "format": "mp3",
                        },
                    },
                )

            print(f"[PTT-BE] MiniMax response status: {tts_resp.status_code}")
            if tts_resp.status_code == 200:
                tts_data = tts_resp.json()
                hex_audio = tts_data.get("data", {}).get("audio", "")
                print(f"[PTT-BE] hex_audio length: {len(hex_audio) if hex_audio else 0}")
                if hex_audio:
                    filename = f"ptt_{uuid.uuid4().hex[:8]}.mp3"
                    filepath = os.path.join(AUDIO_STORAGE_PATH, filename)
                    with open(filepath, "wb") as f:
                        f.write(bytes.fromhex(hex_audio))
                    audio_url = f"/audio/{filename}"
                    print(f"[PTT-BE] Audio saved: {audio_url}")
                else:
                    print(f"[PTT-BE] No hex_audio in response: {list(tts_data.keys())}")
            else:
                print(f"[PTT-BE] MiniMax error: {tts_resp.text}")
        except Exception as e:
            # TTS failure is non-fatal — we still have the text answer
            print(f"[PTT-BE] TTS error (non-fatal): {e}")

    # 4b. Fallback to ElevenLabs if MiniMax didn't produce audio
    if not audio_url and ELEVENLABS_API_KEY:
        try:
            print("[PTT-BE] Falling back to ElevenLabs TTS...")
            async with httpx.AsyncClient(timeout=15.0) as client:
                el_resp = await client.post(
                    "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
                    headers={
                        "xi-api-key": ELEVENLABS_API_KEY,
                        "Content-Type": "application/json",
                    },
                    json={
                        "text": answer,
                        "model_id": "eleven_multilingual_v2",
                        "voice_settings": {
                            "stability": 0.5,
                            "similarity_boost": 0.75,
                        },
                    },
                )

            print(f"[PTT-BE] ElevenLabs response status: {el_resp.status_code}")
            if el_resp.status_code == 200:
                filename = f"ptt_{uuid.uuid4().hex[:8]}.mp3"
                filepath = os.path.join(AUDIO_STORAGE_PATH, filename)
                with open(filepath, "wb") as f:
                    f.write(el_resp.content)
                audio_url = f"/audio/{filename}"
                print(f"[PTT-BE] ElevenLabs audio saved: {audio_url}")
            else:
                print(f"[PTT-BE] ElevenLabs error: {el_resp.text}")
        except Exception as e:
            print(f"[PTT-BE] ElevenLabs error (non-fatal): {e}")

    return {
        "question": question,
        "answer": answer,
        "audio_url": audio_url,
    }
