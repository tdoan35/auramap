# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AuraMap is a mobile app that generates personalized AI-narrated audio walking tours. Users select a destination, choose between direct or scenic routes with POI stops, and receive a cohesive audio tour with real-time karaoke-style transcript highlighting. Built for the AWS x Anthropic x Datadog Hackathon (SF, one-day build).

## Repository Structure

Single `auramap/` project containing the Expo frontend and a `backend/` subdirectory:

- **`app/`** — expo-router file-based routes (screens)
- **`components/`** — Reusable React Native components
- **`stores/`** — Zustand state stores
- **`services/`** — API client modules (Directions, Places, SSE, backend)
- **`utils/`** — Helpers (polyline, karaoke sync, constants)
- **`types/`** — Shared TypeScript types
- **`hooks/`** — Custom React hooks
- **`constants/`** — Theme colors, spacing
- **`backend/`** — FastAPI (Python), Strands Agent orchestration
- **`audio_cache/`** — Runtime-generated MP3s (gitignored)
- **`backend/golden_path/`** — Pre-cached fallback tour data + audio (committed)

Specs live at project root: `AURAMAP_PRODUCT_SPEC.md` (product decisions), `AURAMAP_TECHNICAL_SPEC.md` (architecture + implementation details).

## Development Commands

### Backend

```bash
# Install dependencies
cd backend && pip install -r requirements.txt

# Run dev server (accessible from phone on same network)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# For hackathon venue (conference WiFi blocks local traffic):
ngrok http 8000
```

### Frontend

```bash
npm install

# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo run:ios
```

Set `API_BASE_URL` in `utils/constants.ts` to `http://<laptop-ip>:8000` or the ngrok URL.

## Architecture

### Backend Pipeline (Strands Agent)

A single AWS Strands Agent orchestrates the entire tour generation via four registered tools:

1. **`enrich_poi`** — Google Places Details + Tavily Search → enriched POI profile
2. **`generate_outline`** — Bedrock Claude → structured JSON tour plan (theme, arc, per-segment hooks)
3. **`generate_segment`** — Bedrock Claude → transcript text (sequential, passes previous transcript for coherence)
4. **`generate_audio`** — MiniMax TTS → MP3 file saved to `audio_cache/`

Segments stream to the client via **SSE** from `POST /tour/generate`. The client starts playback as soon as segment 1 arrives (~3-5s); remaining segments generate in the background.

### Frontend State (Zustand, 4 stores)

- **`useAppStore`** — App phase state machine (ROUTE_SETUP → ROUTE_CUSTOMIZATION → TOUR_LOADING → TOUR_PLAYBACK), route mode (direct/scenic)
- **`useRouteStore`** — Start/end locations, polyline, discovered/selected POIs, ordered stops, route legs
- **`useTourStore`** — Segment queue, generation phase, SSE-driven updates
- **`usePlaybackStore`** — Audio state, current position, active card (outline/player)

### Single-Screen Architecture

The entire app is one screen (`app/index.tsx`) with a full-screen map and a transforming bottom card. No multi-screen navigation — state-driven card transitions instead:

- **ROUTE_SETUP:** Search bar visible, no card
- **ROUTE_CUSTOMIZATION:** Pull-up card with route info, Direct/Scenic toggle, stop editor, Start Tour button
- **TOUR_LOADING:** Outline card with per-section loading bars + disabled Play button
- **TOUR_PLAYBACK:** Swipeable cards — outline (left) ↔ audio player with karaoke transcript (right)

### Karaoke Transcript Sync

Audio playback position (`expo-av`) is the source of truth. Every ~33ms, word timings are checked and the active word is highlighted in the transcript. No animated map marker for MVP.

### Golden Path Fallback

If the agent pipeline fails or times out (30s), `serve_golden_path` streams pre-cached segments via the same SSE format. Individual segment timeout is 10s — on failure, that segment is skipped.

## Key API Endpoints

- `POST /tour/generate` — SSE stream: `status`, `segment`, `complete` events
- `POST /tour/{tour_id}/ask` — Q&A during tour (stretch goal)
- `GET /health` — Health check
- `/audio/*` — Static file serving for generated MP3s
- `/golden-audio/*` — Static file serving for pre-cached fallback MP3s

## External Services & Required Env Vars

| Service              | Env Var                                                                              | Used By                                                                       |
| -------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Google Maps/Places   | `GOOGLE_MAPS_API_KEY`                                                                | Frontend (Directions, Nearby Search, Autocomplete) + Backend (Places Details) |
| AWS Bedrock (Claude) | AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`) | Backend — outline + segment generation                                        |
| MiniMax TTS          | `MINIMAX_API_KEY`                                                                    | Backend — text-to-speech                                                      |
| Tavily Search        | `TAVILY_API_KEY`                                                                     | Backend — POI enrichment                                                      |
| Datadog              | `DD_API_KEY`                                                                         | Backend — observability                                                       |

## Tech Decisions

- **Bedrock model:** Claude Sonnet (speed over quality — ~2-3x faster than Opus for narrative content)
- **TTS:** MiniMax `speech-02-hd` with `English_CalmWoman` voice (targets MiniMax prize track)
- **SSE over WebSocket:** One-directional stream is sufficient; simpler implementation
- **Client-side routing:** Google Directions API called directly from frontend (no backend proxy)
- **Word count calibration:** ~150 words/min TTS output; transit segments target 85% of walk time

## Datadog Instrumentation

`ddtrace.patch_all()` auto-instruments FastAPI, httpx, boto3. Manual spans wrap each Strands tool. Key custom metrics: `auramap.time_to_first_audio`, `auramap.segment.generation_latency`, `auramap.llm.input_tokens`, `auramap.tour.estimated_cost_usd`.
