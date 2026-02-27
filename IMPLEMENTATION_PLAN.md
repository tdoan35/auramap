# AuraMap — Implementation Plan

> **Derived from:** [AURAMAP_TECHNICAL_SPEC.md](./AURAMAP_TECHNICAL_SPEC.md) + [AURAMAP_PRODUCT_SPEC.md](./AURAMAP_PRODUCT_SPEC.md)
> **Timeline:** ~6 hours (hackathon day)
> **Pre-requisites:** Boilerplate, packages, and test environments set up before hackathon (per rules)

---

## Pre-Hackathon Setup (Before Day-Of)

Complete these before the hackathon clock starts. No business logic — only scaffolding.

### P1. Environment & Credentials

- [ ] Create `.env` with all required keys: `GOOGLE_MAPS_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `MINIMAX_API_KEY`, `TAVILY_API_KEY`, `DD_API_KEY`
- [ ] Verify Google Maps API key has Directions, Places, and Autocomplete enabled
- [ ] Verify AWS Bedrock access for `us.anthropic.claude-sonnet-4-20250514-v1:0` in `us-east-1`
- [ ] Test MiniMax TTS API with a sample transcript to confirm voice `English_CalmWoman` works
- [ ] Install and test ngrok (`ngrok http 8000`) — confirm tunnel works

### P2. Frontend Scaffolding

- [ ] Initialize Expo project with TypeScript template (already done — `app.json` exists)
- [ ] Install all frontend dependencies:
  - `react-native-maps`, `expo-av`, `react-native-google-places-autocomplete`
  - `zustand`, `expo-router`, SSE polyfill (`eventsource` or `react-native-event-source`)
- [ ] Confirm `expo-router` file-based routing works with `app/_layout.tsx`
- [ ] Confirm `react-native-maps` renders on iOS simulator
- [ ] Confirm `expo-av` can play a local MP3

### P3. Backend Scaffolding

- [ ] Create `backend/` directory structure per spec (routers, agent, models, services)
- [ ] Install all backend dependencies via `pip install -r requirements.txt`:
  - `fastapi`, `uvicorn`, `strands-agents`, `strands-agents-tools`, `boto3`, `httpx`
  - `tavily-python`, `pydantic`, `sse-starlette`, `python-dotenv`, `ddtrace`, `datadog`
- [ ] Confirm `uvicorn main:app --host 0.0.0.0 --port 8000` starts with a bare FastAPI app
- [ ] Confirm `boto3` can reach Bedrock with test `invoke_model` call

### P4. Golden Path Pre-Generation

- [ ] Choose golden path route: Hackathon venue → SF Ferry Building with 1–2 POIs
- [ ] Manually run the enrichment + outline + segment + TTS pipeline for this route
- [ ] Save outputs to `backend/golden_path/tour_data.json` and `backend/golden_path/audio/segment_*.mp3`
- [ ] Commit golden path assets to the repo

---

## Phase 1: Backend Skeleton (0:00 – 0:45)

**Goal:** A running FastAPI server with models, config, health check, static file serving, and an SSE endpoint shell that returns hardcoded test events.

### 1.1 Config & Models

**Files:** `backend/config.py`, `backend/models/tour.py`, `backend/models/requests.py`

- [ ] `config.py` — Load all env vars via `python-dotenv`, validate required keys exist
- [ ] `models/tour.py` — Define Pydantic models:
  - `Location` (lat, lng, name)
  - `POI` (place_id, name, lat, lng, types, rating)
  - `EnrichedPOI` (extends POI with description, history, stories, reviews_summary)
  - `RouteLeg` (start_name, end_name, distance_m, duration_s)
  - `TourSegment` (segment_id, type, label, target_duration_s, target_word_count, key_themes, transition_hook, story_angle, poi_name)
  - `TourOutline` (tour_id, theme, tone, arc, segments)
  - `GeneratedSegment` (segment_id, type, label, transcript, audio_url, duration_s)
- [ ] `models/requests.py` — Define request/response models:
  - `RouteData` (start, end, polyline, total_distance_m, total_duration_s)
  - `TourGenerateRequest` (route, selected_pois, legs, voice_id)
  - `TourAskRequest` + `TourAskContext` (stretch)

**Acceptance:** Models import cleanly, no runtime errors.

### 1.2 FastAPI App + Static Serving

**Files:** `backend/main.py`, `backend/routers/health.py`

- [ ] `main.py` — FastAPI app with:
  - `StaticFiles` mount at `/audio` → `audio_cache/`
  - `StaticFiles` mount at `/golden-audio` → `golden_path/audio/`
  - Include `health` and `tour` routers
  - CORS middleware (allow all origins for hackathon)
- [ ] `routers/health.py` — `GET /health` returns `{"status": "ok"}`
- [ ] Create `audio_cache/` directory (gitignored)

**Acceptance:** `curl http://localhost:8000/health` returns `{"status": "ok"}`. Static file routes serve golden path audio.

### 1.3 SSE Endpoint Shell

**File:** `backend/routers/tour.py`

- [ ] `POST /tour/generate` — Accept `TourGenerateRequest` body
- [ ] Return an SSE `EventSourceResponse` that streams hardcoded test events:
  - `event: status` → `{"phase": "enriching_pois", "message": "Testing..."}`
  - `event: segment` → mock segment with golden path audio URL
  - `event: complete` → `{"tour_id": "test", "total_segments": 1, "total_duration_s": 30}`
- [ ] Generate a `tour_id` using `uuid4().hex[:8]`

**Acceptance:** `curl -X POST http://localhost:8000/tour/generate -H "Content-Type: application/json" -d '{...}'` streams SSE events.

---

## Phase 2: Agent Pipeline (0:45 – 2:15)

**Goal:** Strands Agent fully orchestrates: enrich POIs → generate outline → generate segments + TTS → stream via SSE. Tested end-to-end with curl.

### 2.1 External Service Clients

**Files:** `backend/services/google_places.py`, `backend/services/tavily_client.py`, `backend/services/bedrock_client.py`, `backend/services/minimax_tts.py`, `backend/services/audio_store.py`

- [ ] `google_places.py` — `async def get_place_details(place_id: str) -> dict`
  - Call Google Places Details API with fields: name, editorial_summary, reviews, rating, formatted_address, types
  - Return parsed response
- [ ] `tavily_client.py` — `async def search_poi(name: str, city: str = "San Francisco") -> list[dict]`
  - Query: `"{name} {city} history stories interesting facts"`
  - `max_results=3`, `search_depth="basic"`
  - Return list of `{title, content}` results
- [ ] `bedrock_client.py` — `async def invoke_claude(system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str`
  - Use `boto3` Bedrock runtime client
  - Model: `us.anthropic.claude-sonnet-4-20250514-v1:0`
  - Return response text
- [ ] `minimax_tts.py` — `async def text_to_speech(text: str, voice_id: str = "English_CalmWoman") -> bytes`
  - POST to `https://api.minimaxi.chat/v1/t2a_v2`
  - Model: `speech-02-hd`, format: mp3, sample_rate: 32000
  - Return decoded MP3 bytes
- [ ] `audio_store.py` — `def save_audio(mp3_bytes: bytes, tour_id: str, segment_id: int) -> tuple[str, float]`
  - Save to `audio_cache/{tour_id}/segment_{segment_id}.mp3`
  - Return `(audio_url, duration_s)` — URL is relative path for static serving
  - Use `mutagen` or file size estimation for duration

**Acceptance:** Each service client can be tested independently with a simple script.

### 2.2 Agent Tool Definitions

**Files:** `backend/agent/tools/enrich_poi.py`, `backend/agent/tools/generate_outline.py`, `backend/agent/tools/generate_segment.py`, `backend/agent/tools/generate_audio.py`

- [ ] `enrich_poi` — `@tool` decorated function
  - Input: place_id, name, lat, lng
  - Calls `google_places.get_place_details()` + `tavily_client.search_poi()`
  - Returns combined `EnrichedPOI` dict
- [ ] `generate_outline` — `@tool` decorated function
  - Input: enriched_pois list, route_data, voice_id
  - Calculate target durations and word counts (150 words/min, 85% of walk time for transit)
  - Call `bedrock_client.invoke_claude()` with outline prompt
  - Parse JSON response into `TourOutline`
  - Return outline dict
- [ ] `generate_segment` — `@tool` decorated function
  - Input: outline, segment_index, enriched_poi (optional), previous_transcript (optional), target_word_count
  - Call `bedrock_client.invoke_claude()` with segment prompt
  - Return transcript text
- [ ] `generate_audio` — `@tool` decorated function
  - Input: transcript, voice_id, tour_id, segment_id
  - Call `minimax_tts.text_to_speech()`
  - Call `audio_store.save_audio()`
  - Return `{audio_url, duration_s}`

**Acceptance:** Each tool runs successfully when called directly (outside the agent).

### 2.3 Prompt Templates

**Files:** `backend/agent/prompts/outline_prompt.py`, `backend/agent/prompts/segment_prompt.py`

- [ ] `outline_prompt.py` — Functions that build system + user prompts for outline generation
  - System prompt: creative tour guide planner, outputs JSON
  - User prompt template: route details, enriched POIs, leg data, word count targets, JSON schema
- [ ] `segment_prompt.py` — Functions that build system + user prompts for segment generation
  - System prompt: tour narrator, second person, vivid, conversational
  - User prompt template: full outline, this segment's data, POI data (if applicable), previous transcript, word count target

**Acceptance:** Prompts render correctly with sample data.

### 2.4 Strands Agent Definition

**File:** `backend/agent/tour_agent.py`

- [ ] Instantiate `BedrockModel` with Claude Sonnet model ID and `us-east-1` region
- [ ] Create `Agent` with all 4 tools registered and system prompt describing the pipeline:
  1. Enrich each POI (parallel if supported)
  2. Generate outline with enriched data
  3. For each segment sequentially: generate transcript → generate audio
- [ ] Expose a function `run_tour_agent(request: TourGenerateRequest, sse_queue: asyncio.Queue)` that:
  - Constructs the agent prompt from the request data
  - Runs the agent
  - Pushes SSE events (status updates, segment completions) to the queue

**Acceptance:** Agent runs end-to-end for a test request. Segments appear in `audio_cache/`.

### 2.5 Wire Agent into SSE Endpoint

**File:** `backend/routers/tour.py` (update)

- [ ] Replace hardcoded test events with actual agent invocation
- [ ] Run agent in a background task; SSE endpoint reads from `asyncio.Queue`
- [ ] Push `status` events at each pipeline phase
- [ ] Push `segment` events as each segment completes (audio URL, transcript, duration)
- [ ] Push `complete` event when all segments are done
- [ ] Wrap agent invocation in `asyncio.timeout(30)` — on failure, call `serve_golden_path()`

### 2.6 Golden Path Fallback

**File:** `backend/routers/tour.py` (add `serve_golden_path` function)

- [ ] `async def serve_golden_path(sse_queue: asyncio.Queue)`:
  - Read `golden_path/tour_data.json`
  - Stream each segment as an SSE event with golden path audio URLs
  - Add ~1s artificial delay between events to simulate generation
- [ ] Per-segment timeout: if any single segment takes >10s, skip it and continue

**Acceptance:** `curl -X POST /tour/generate` with a real route request streams real segments with audio. On timeout/failure, golden path segments stream instead.

---

## Phase 3: Frontend — Map + Route Setup (2:15 – 3:15)

**Goal:** Single-screen map with search bar, route display, POI markers, bottom card with route info + Direct/Scenic toggle, expandable stop editor.

### 3.1 Shared Types & Constants

**Files:** `types/index.ts`, `utils/constants.ts`

- [ ] `types/index.ts` — All TypeScript interfaces from spec:
  - `LatLng`, `Location`, `POI`, `RouteLeg`, `Segment`
  - `TourGenerateRequest`, `SSEStatusEvent`, `SSESegmentEvent`, `SSECompleteEvent`
  - `AppPhase` type: `"ROUTE_SETUP" | "ROUTE_CUSTOMIZATION" | "TOUR_LOADING" | "TOUR_PLAYBACK"`
- [ ] `utils/constants.ts` — Config values:
  - `API_BASE_URL` (set to laptop IP or ngrok URL)
  - `GOOGLE_MAPS_API_KEY`
  - POI discovery radius (200m), max displayed (7), max selectable (4)

**Acceptance:** Types import cleanly across the app.

### 3.2 Zustand Stores

**Files:** `stores/useAppStore.ts`, `stores/useRouteStore.ts`, `stores/useTourStore.ts`, `stores/usePlaybackStore.ts`

- [ ] `useAppStore` — State: phase (AppPhase), routeMode ("direct" | "scenic")
  - Actions: setPhase, setRouteMode, resetToSetup
- [ ] `useRouteStore` — State: startLocation, endLocation, polyline, encodedPolyline, totalDistanceM, totalDurationS, legs, discoveredPOIs, selectedPOIIds, stops (ordered list)
  - Actions: setStart, setEnd, setRoute, setDiscoveredPOIs, togglePOI, addStop, removeStop, reorderStops, updateLegs, clearRoute
- [ ] `useTourStore` — State: tourId, segments, generationPhase, isGenerating, isComplete, error
  - Actions: startGeneration, setPhase, addSegment, updateSegmentStatus, setComplete, setError, reset
- [ ] `usePlaybackStore` — State: isPlaying, currentSegmentId, currentPositionMs, totalElapsedMs, activeCard ("outline" | "player")
  - Actions: play, pause, skipToNext, updatePosition, setActiveCard, reset

**Acceptance:** Stores can be imported and state updates work in isolation.

### 3.3 Services: Directions & Places

**Files:** `services/directionsService.ts`, `services/placesService.ts`

- [ ] `directionsService.ts` — `getWalkingRoute(origin, destination, waypoints?)`
  - Call Google Directions API with `mode=walking`
  - If waypoints provided, use `optimize:true` for optimal ordering
  - Return: encoded polyline, decoded path, total distance/duration, legs array
- [ ] `placesService.ts` — `discoverPOIs(polyline, radiusM = 200)`
  - Sample 3–5 evenly spaced points along the polyline
  - Call Google Places Nearby Search at each point with `type=tourist_attraction`
  - Deduplicate by `place_id`, sort by distance to route
  - Return top 5–7 POIs

**Acceptance:** Services return real data from Google APIs.

### 3.4 Utility: Polyline Decoder

**File:** `utils/polyline.ts`

- [ ] `decodePolyline(encoded: string): LatLng[]` — Google's polyline encoding algorithm
- [ ] `interpolateAlongPath(path: LatLng[], fraction: number): LatLng` — Linear interpolation
- [ ] `totalPathDistance(path: LatLng[]): number` — Haversine distance sum

**Acceptance:** Decoded polyline coordinates match Google Maps display.

### 3.5 Single Screen + Map (`app/index.tsx`)

**Components:** `MapView.tsx`, `SearchBar.tsx`

- [ ] Restructure `app/` — remove `(tabs)/` directory and `modal.tsx`, create flat `app/index.tsx`
- [ ] Update `app/_layout.tsx` — single headerless Stack with only `index` screen
- [ ] `MapView.tsx` — Wrapper around `react-native-maps` `<MapView>`
  - Initial region: San Francisco center
  - Renders polyline when route exists
  - Renders markers for start/end pins
  - Renders POI markers when discovered
  - Free pan/zoom always enabled
- [ ] `SearchBar.tsx` — Google Places Autocomplete floating over the map
  - On select: set destination in `useRouteStore`, start defaults to current location
  - Hides after route is set (controlled by `phase` state)
- [ ] `app/index.tsx` — Single screen composition:
  - `MapView` as full-screen background
  - `SearchBar` overlay (visible in `ROUTE_SETUP` phase)
  - Bottom card system (visible in all other phases)
  - Phase-driven rendering: shows appropriate card content based on `useAppStore.phase`
  - When destination is set: call `getWalkingRoute()`, call `discoverPOIs()`, transition to `ROUTE_CUSTOMIZATION`

**Acceptance:** User can search for a destination, see a walking route on the map with POI markers.

### 3.6 Bottom Card: Route Info + Stop Editor

**Components:** `BottomCard.tsx`, `RouteCard.tsx`, `StopEditor.tsx`, `POIMarker.tsx`

- [ ] `BottomCard.tsx` — Pull-up sheet container
  - Two snap points: collapsed (~120px peek) and half-expanded (~50%)
  - Drag handle at top
  - Content slot rendered based on current phase
- [ ] `RouteCard.tsx` — Card content for `ROUTE_CUSTOMIZATION` phase (collapsed view):
  - Route summary: total distance, walk time, number of POIs
  - "Direct" / "Scenic" toggle buttons
    - Direct: route straight start → destination
    - Scenic: route through all discovered POIs (up to max 3–4) → destination
  - "Start Tour" button → transitions to `TOUR_LOADING` phase
- [ ] `StopEditor.tsx` — Card content for `ROUTE_CUSTOMIZATION` phase (expanded view):
  - Ordered list of stops (POIs on the route)
  - Add stop: search for additional POIs
  - Remove stop: swipe or tap X to remove
  - Reorder stops: drag to rearrange
  - On every change: recalculate route via `getWalkingRoute()` with updated waypoints
- [ ] `POIMarker.tsx` — Custom map marker for POIs
  - Visual indicator on map for each discovered POI
  - Tap to view POI name/info

**Acceptance:** Bottom card shows route summary with Direct/Scenic toggle, expands to show editable stop list, route recalculates on changes.

---

## Phase 4: Frontend — Tour Generation + Playback (3:15 – 4:45)

**Goal:** SSE connection, outline card with loading bars, swipeable card system, audio player with karaoke transcript, playback controls.

### 4.1 SSE Service

**File:** `services/sseService.ts`

- [ ] `connectToTourStream(tourRequest, callbacks)` — Returns `{ close: () => void }`
  - Use `fetch` with `ReadableStream` to consume SSE from POST endpoint (no native EventSource for POST)
  - Parse SSE event types: `status`, `segment`, `complete`, `error`
  - Call appropriate callback for each event
  - Handle connection errors and retries (simple — one retry, then surface error)

**Acceptance:** SSE client receives all event types from the backend endpoint.

### 4.2 Tour Loading: Outline Card

**Component:** `OutlineCard.tsx`

- [ ] When `TOUR_LOADING` phase begins:
  - Build `TourGenerateRequest` from `useRouteStore` state
  - Call `startGeneration()` on `useTourStore`
  - Connect SSE via `connectToTourStream()`
  - `onStatus` → update `generationPhase` in tour store
  - `onSegment` → `addSegment()` to tour store
  - `onError` → show error in card, offer retry
- [ ] `OutlineCard.tsx` — Bottom card content for `TOUR_LOADING` phase:
  - List of tour sections (from outline) with per-section loading bars
  - Each section shows: label, progress bar (pending → generating → ready)
  - **Play button** at the top — disabled until first segment is `ready`
  - When Play is tapped → transition to `TOUR_PLAYBACK` phase

**Acceptance:** Outline card shows generation progress, Play button enables when segment 1 arrives.

### 4.3 Audio Playback Logic

**File:** `hooks/useAudioPlayer.ts`

- [ ] Use `expo-av` `Audio.Sound` API
- [ ] Playback state machine: IDLE → PLAYING → WAITING → BUFFERING → PAUSED → COMPLETE
- [ ] Load and play segments sequentially:
  - When segment N finishes: 2–3s pause → load segment N+1 → play
  - If N+1 not ready: show loading indicator, wait for it
- [ ] Preload: when segment N starts, preload N+1 if `ready`
- [ ] Expose: `play()`, `pause()`, `skipToNext()`
- [ ] Track `currentPositionMs` by polling `sound.getStatusAsync()` at ~33ms intervals
- [ ] Update `usePlaybackStore` with current position

**Acceptance:** Audio plays through all segments sequentially with pause/skip controls.

### 4.4 Karaoke Transcript Engine

**Files:** `utils/karaokeSync.ts`, `components/KaraokeTranscript.tsx`

- [ ] `karaokeSync.ts`:
  - `estimateWordTimings(transcript, durationMs)` — distribute words evenly across duration (~150 words/min)
  - `getActiveWordIndex(words, positionMs)` — binary search for current word
- [ ] `KaraokeTranscript.tsx` — Component:
  - Renders transcript as individually styled word spans
  - Active word is highlighted (bold + color)
  - Past words are dimmed, upcoming words are normal
  - Auto-scrolls to keep active word visible
  - Updates at ~33ms based on `usePlaybackStore.currentPositionMs`

**Acceptance:** Words highlight in sync with audio playback, transcript auto-scrolls smoothly.

### 4.5 Swipeable Card System + Audio Player

**Components:** `SwipeableCardContainer.tsx`, `AudioPlayerCard.tsx`

- [ ] `SwipeableCardContainer.tsx` — Horizontal swipe container:
  - Two pages: OutlineCard (left) ↔ AudioPlayerCard (right)
  - When Play is tapped: audio player slides in from right, becomes active
  - User can freely swipe left/right between cards
  - Updates `usePlaybackStore.activeCard` on swipe
- [ ] `AudioPlayerCard.tsx` — Card content for `TOUR_PLAYBACK` phase:
  - `KaraokeTranscript` component showing current segment's transcript
  - Current segment label (e.g., "Walking to Coit Tower")
  - Play / Pause button
  - Skip Forward button (jump to next segment)
  - Playback progress bar for current segment
- [ ] OutlineCard during playback: sections show progress states (completed, playing, generating, pending)
- [ ] SSE connection stays active — new segments added to queue as they arrive
- [ ] End of tour: show completion state, "Done" button resets to `ROUTE_SETUP`

**Acceptance:** Swipeable cards work smoothly, audio plays with karaoke transcript, controls work, tour can complete and reset.

---

## Phase 5: Golden Path & Fallback Wiring (4:45 – 5:15)

**Goal:** Safety net for the live demo. If anything fails, the app seamlessly serves the pre-cached tour.

### 5.1 Backend Fallback

- [ ] Verify `serve_golden_path()` function works (from Phase 2.6)
- [ ] Test: kill Bedrock access, confirm golden path kicks in within 30s timeout
- [ ] Test: slow down one segment generation beyond 10s, confirm it's skipped

### 5.2 Frontend Resilience

- [ ] SSE `onError` callback: show user-friendly message, offer "Try Again" button
- [ ] If SSE disconnects mid-tour: continue playing already-received segments
- [ ] If no segments arrive after 30s: show fallback message

### 5.3 End-to-End Golden Path Test

- [ ] Full flow: open app → select golden path route → confirm POIs → tour loads → audio plays → marker walks → tour ends
- [ ] Time the entire flow, ensure < 5s to first audio

**Acceptance:** Golden path tour plays flawlessly even with backend services disabled.

---

## Phase 6: Datadog Observability (5:15 – 5:45)

**Goal:** Instrumented backend with traces, spans, and metrics feeding a Datadog dashboard.

### 6.1 Auto-Instrumentation

**File:** `backend/main.py` (update top of file)

- [ ] Add `ddtrace.patch_all()` before FastAPI init — auto-instruments FastAPI, httpx, boto3
- [ ] Configure tracer with `tracer.configure(hostname="localhost", port=8126)`
- [ ] Start local Datadog agent: `DD_API_KEY=<key> DD_SITE=datadoghq.com datadog-agent run`

### 6.2 Manual Spans for Agent Tools

**Files:** Each tool in `backend/agent/tools/`

- [ ] Wrap each tool body in `with tracer.trace("agent.tool.<name>", service="auramap") as span:`
- [ ] Set relevant tags: POI name/ID, segment type, word count, etc.
- [ ] Log token counts from Bedrock responses

### 6.3 Custom Metrics

**File:** `backend/services/` (add metrics calls throughout)

- [ ] `auramap.time_to_first_audio` — timing from request start to first segment SSE push
- [ ] `auramap.segment.generation_latency` — per-segment, tagged by type
- [ ] `auramap.llm.input_tokens` / `auramap.llm.output_tokens` — per Bedrock call, tagged by tool
- [ ] `auramap.tour.estimated_cost_usd` — estimated cost gauge per tour
- [ ] `auramap.api.google_places` / `auramap.api.tavily` / `auramap.api.minimax_tts` / `auramap.api.bedrock` — per-call latencies

### 6.4 Dashboard

- [ ] Create Datadog dashboard with 4 sections:
  - **User Experience:** Time-to-first-audio gauge, tour generation total time timeseries
  - **Agent Pipeline:** Flame graph / trace waterfall showing full agent trace
  - **LLM Performance:** Token usage (stacked bar), Bedrock latency, estimated cost per tour
  - **External APIs:** Response time heatmaps for Google Places, Tavily, MiniMax TTS

**Acceptance:** Dashboard shows real data from a test tour generation. Agent trace is visible with all tool spans.

---

## Phase 7: Polish & Stretch (5:45 – 6:00)

**Goal:** Final testing on Expo Go, UI polish, and stretch features if ahead of schedule.

### 7.1 Final Testing

- [ ] Full end-to-end test on physical device via Expo Go
- [ ] Test with a non-golden-path route (novel start/end)
- [ ] Verify audio playback is smooth with no gaps between segments
- [ ] Verify marker animation is synced to audio
- [ ] Test pause/resume and skip
- [ ] Verify Datadog dashboard populates during test run

### 7.2 UI Polish

- [ ] Consistent color theme across all screens
- [ ] Loading states and transitions feel smooth
- [ ] Map markers are visually distinct (start pin, end pin, POI suggested, POI selected, animated marker)
- [ ] Audio player card has clean typography and controls
- [ ] No layout jank or scrolling issues

### 7.3 Stretch: Q&A During Tour (~45 min)

Only attempt if Phase 6 is complete and tested.

- [ ] `POST /tour/{tour_id}/ask` endpoint
  - Accept `TourAskRequest` with question + context
  - Direct Bedrock Claude call (no agent needed) with tour context
  - Generate TTS audio response
  - Return `{answer, audio_url}`
- [ ] Frontend: microphone/text button on playback screen
- [ ] Pause current audio, play Q&A response, resume tour

### 7.4 Stretch: Voice Selection (~20 min)

- [ ] Add voice dropdown on Screen 1 (hardcoded list of MiniMax voice IDs)
- [ ] Pass `voice_id` through store → request → backend (already parameterized in spec)

---

## Dependency Graph

```
Pre-Hackathon Setup
       │
       ▼
Phase 1: Backend Skeleton ──────────────┐
       │                                 │
       ▼                                 │
Phase 2: Agent Pipeline                  │
       │                                 │
       │    Phase 3: Map + Route ◄───────┘
       │         │
       ▼         ▼
Phase 4: Tour + Playback (needs both Phase 2 SSE + Phase 3 stores/services)
       │
       ▼
Phase 5: Golden Path (needs Phase 2 + Phase 4)
       │
       ▼
Phase 6: Datadog (needs Phase 2 agent running)
       │
       ▼
Phase 7: Polish + Stretch
```

**Phase 2 and Phase 3 can run in parallel** if working with a partner, or sequentially solo (backend first since frontend depends on real SSE data for testing Phase 4).

---

## Key Risk Mitigations

| Risk                                 | Mitigation                                                             |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Bedrock latency too high             | Use Claude Sonnet (not Opus); pre-cached golden path as fallback       |
| MiniMax TTS API down                 | Golden path has pre-generated audio                                    |
| Conference WiFi blocks local traffic | Use ngrok for backend access                                           |
| SSE connection drops                 | Frontend continues playing received segments; show retry button        |
| Strands SDK issues                   | Can fallback to direct Bedrock calls without agent orchestration       |
| Time runs out before Phase 4         | Golden path fallback covers the demo; Screens 1-2 still work for setup |
| Google API rate limits               | Pre-cache golden path; limit POI discovery to 3-5 sample points        |

---

## Success Checklist

- [ ] End-to-end flow works: search → route → Direct/Scenic toggle → Start Tour → outline loads → Play → karaoke playback
- [ ] Time-to-first-audio < 5 seconds
- [ ] Audio narration sounds like a real tour guide (warm, conversational, second-person)
- [ ] Karaoke transcript highlights words in sync with audio playback
- [ ] Swipeable cards work smoothly (outline ↔ audio player)
- [ ] Bottom card pull-up / collapse feels native
- [ ] Datadog dashboard shows full agent trace with per-tool spans and metrics
- [ ] Golden path fallback works seamlessly if live generation fails
- [ ] App runs on physical device via Expo Go
- [ ] Demo-ready for ~5-minute tour with 1-2 POIs
