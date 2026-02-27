# AuraMap — Technical Spec (Hackathon MVP)

> **Status:** Living Document — v0.1
> **Last Updated:** 2026-02-19
> **Context:** AWS x Anthropic x Datadog Hackathon (SF, one-day build, ~6 hours hacking)
> **Author:** Ty
> **Companion:** [AURAMAP_PRODUCT_SPEC.md](./AURAMAP_PRODUCT_SPEC.md)

---

## 1. Repository Structure

Single project with the Expo frontend at the root and a `backend/` subdirectory for the Python API:

```
auramap/
├── .env                              # Shared env vars (gitignored)
├── .gitignore
├── AURAMAP_PRODUCT_SPEC.md
├── AURAMAP_TECHNICAL_SPEC.md
├── CLAUDE.md
├── app.json                          # Expo config
├── eas.json                          # EAS Build + Update config
├── package.json
├── tsconfig.json
├── app/                              # expo-router file-based routes
│   ├── _layout.tsx                   # Root layout (single screen, no tabs)
│   ├── index.tsx                     # Single-screen app: map + bottom card
│   └── +not-found.tsx                # 404 fallback
├── components/
│   ├── MapView.tsx                   # Wrapper around react-native-maps
│   ├── SearchBar.tsx                 # Google Places Autocomplete input
│   ├── BottomCard.tsx                # Pull-up bottom card container (handles drag/snap)
│   ├── RouteCard.tsx                 # Card content: route summary + Direct/Scenic toggle
│   ├── StopEditor.tsx                # Expanded card: editable stop list (add/remove/reorder)
│   ├── OutlineCard.tsx               # Card content: tour outline with per-section loading bars
│   ├── AudioPlayerCard.tsx           # Card content: transcript + playback controls
│   ├── SwipeableCardContainer.tsx    # Horizontal swipe between outline ↔ audio player
│   ├── KaraokeTranscript.tsx         # Word-level highlight synced to audio playback
│   └── POIMarker.tsx                 # Map marker (suggested vs selected states)
├── stores/
│   ├── useRouteStore.ts              # Route, start/end, polyline, POIs
│   ├── useTourStore.ts               # Segment queue, generation status
│   └── usePlaybackStore.ts           # Audio state, current segment, position
├── services/
│   ├── directionsService.ts          # Google Directions API (client-direct)
│   ├── placesService.ts              # Google Places Nearby + Autocomplete
│   ├── sseService.ts                 # SSE client for tour generation events
│   └── apiClient.ts                  # HTTP client for backend REST calls
├── utils/
│   ├── polyline.ts                   # Polyline decoding + distance helpers
│   ├── karaokeSync.ts                # Word-level timing estimation for transcript highlighting
│   └── constants.ts                  # Config values, API base URL, etc.
├── types/
│   └── index.ts                      # Shared TypeScript types
├── hooks/                            # Custom React hooks
├── constants/                        # Theme colors, spacing, etc.
├── assets/                           # Static assets (icons, images, splash)
├── backend/                          # FastAPI Python backend
│   ├── requirements.txt
│   ├── main.py                       # FastAPI app entry point
│   ├── config.py                     # Env var loading + validation
│   ├── routers/
│   │   ├── tour.py                   # POST /tour/generate (SSE), POST /tour/{id}/ask
│   │   └── health.py                 # GET /health
│   ├── agent/
│   │   ├── tour_agent.py             # Strands Agent definition + tool registration
│   │   ├── tools/
│   │   │   ├── enrich_poi.py         # Google Places Details + Tavily search
│   │   │   ├── generate_outline.py   # Bedrock Claude — tour outline JSON
│   │   │   ├── generate_segment.py   # Bedrock Claude — segment transcript
│   │   │   └── generate_audio.py     # MiniMax TTS — transcript to MP3
│   │   └── prompts/
│   │       ├── outline_prompt.py     # System + user prompts for outline generation
│   │       └── segment_prompt.py     # System + user prompts for segment generation
│   ├── models/
│   │   ├── tour.py                   # Pydantic models: Tour, Segment, POI, etc.
│   │   └── requests.py              # Pydantic models for API request/response
│   ├── services/
│   │   ├── google_places.py          # Google Places Details API client
│   │   ├── tavily_client.py          # Tavily Search API client
│   │   ├── bedrock_client.py         # AWS Bedrock (Claude) client
│   │   ├── minimax_tts.py            # MiniMax TTS API client
│   │   └── audio_store.py            # Local filesystem audio storage + serving
│   └── golden_path/                  # Pre-cached fallback tour
│       ├── tour_data.json            # Route, POIs, segments metadata
│       └── audio/                    # Pre-generated MP3 files
│           ├── segment_1_opening.mp3
│           ├── segment_2_transit.mp3
│           ├── segment_3_poi_arrival.mp3
│           └── ...
└── audio_cache/                      # Runtime-generated audio (gitignored)
```

---

## 2. Tech Stack & Dependencies

### Frontend

| Package                                               | Purpose                                            |
| ----------------------------------------------------- | -------------------------------------------------- |
| `expo` (~53)                                          | Framework + dev tooling                            |
| `react-native-maps`                                   | Google Maps rendering, polylines, markers          |
| `expo-av`                                             | Audio playback (MP3 segments)                      |
| `react-native-google-places-autocomplete`             | Search bar with Places Autocomplete                |
| `zustand`                                             | State management (3 stores)                        |
| `react-native-event-source` or `eventsource` polyfill | SSE client (React Native lacks native EventSource) |
| `typescript`                                          | Type safety                                        |
| `expo-router` (~5)                                    | File-based screen navigation                       |

### Backend

| Package                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `fastapi`              | HTTP framework + SSE support               |
| `uvicorn`              | ASGI server                                |
| `strands-agents`       | AWS Strands Agents SDK                     |
| `strands-agents-tools` | Pre-built tool utilities (if applicable)   |
| `boto3`                | AWS Bedrock client                         |
| `httpx`                | Async HTTP client (Google Places, MiniMax) |
| `tavily-python`        | Tavily Search API client                   |
| `pydantic`             | Request/response validation                |
| `sse-starlette`        | SSE response streaming for FastAPI         |
| `python-dotenv`        | Env var loading                            |
| `ddtrace`              | Datadog auto-instrumentation               |
| `datadog`              | DogStatsD client (`statsd` metrics)        |

---

## 3. Backend Architecture

### 3.1 FastAPI Application

```python
# main.py — simplified structure
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routers import tour, health

app = FastAPI(title="AuraMap API")

# Serve generated audio files
app.mount("/audio", StaticFiles(directory="audio_cache"), name="audio")

# Serve golden path audio
app.mount("/golden-audio", StaticFiles(directory="golden_path/audio"), name="golden-audio")

app.include_router(health.router)
app.include_router(tour.router, prefix="/tour")
```

### 3.2 API Endpoints

#### `POST /tour/generate` — Start Tour Generation (SSE)

Triggers the Strands Agent and streams segment events back to the client.

**Request body:**

```json
{
  "route": {
    "start": { "lat": 37.7749, "lng": -122.4194, "name": "Moscone Center" },
    "end": { "lat": 37.7955, "lng": -122.3937, "name": "Ferry Building" },
    "polyline": "encoded_polyline_string",
    "total_distance_m": 2400,
    "total_duration_s": 1800
  },
  "selected_pois": [
    {
      "place_id": "ChIJ...",
      "name": "Coit Tower",
      "lat": 37.8024,
      "lng": -122.4058,
      "types": ["tourist_attraction", "point_of_interest"],
      "rating": 4.6
    }
  ],
  "legs": [
    {
      "start_name": "Moscone Center",
      "end_name": "Coit Tower",
      "distance_m": 1200,
      "duration_s": 900
    },
    {
      "start_name": "Coit Tower",
      "end_name": "Ferry Building",
      "distance_m": 1200,
      "duration_s": 900
    }
  ],
  "voice_id": "English_CalmWoman"
}
```

**SSE event stream:**

```
event: status
data: {"phase": "enriching_pois", "message": "Researching Coit Tower..."}

event: status
data: {"phase": "generating_outline", "message": "Planning your tour..."}

event: status
data: {"phase": "generating_segments", "message": "Writing your tour narration..."}

event: segment
data: {"segment_id": 1, "type": "opening", "label": "Welcome to Your Tour", "audio_url": "http://localhost:8000/audio/tour_abc123/segment_1.mp3", "transcript": "Welcome to San Francisco...", "duration_s": 30}

event: segment
data: {"segment_id": 2, "type": "transit", "label": "Walking to Coit Tower", "audio_url": "http://localhost:8000/audio/tour_abc123/segment_2.mp3", "transcript": "As you head north on...", "duration_s": 120}

event: segment
data: {"segment_id": 3, "type": "poi_arrival", "label": "Coit Tower", "audio_url": "http://localhost:8000/audio/tour_abc123/segment_3.mp3", "transcript": "You're now standing at...", "duration_s": 75}

event: segment
data: {"segment_id": 4, "type": "outro", "label": "Final Stretch", "audio_url": "http://localhost:8000/audio/tour_abc123/segment_4.mp3", "transcript": "As you continue toward...", "duration_s": 60}

event: complete
data: {"tour_id": "abc123", "total_segments": 4, "total_duration_s": 285}
```

#### `POST /tour/{tour_id}/ask` — Q&A During Tour (Stretch)

**Request body:**

```json
{
  "question": "What year was Coit Tower built?",
  "context": {
    "current_segment_id": 3,
    "current_segment_type": "poi_arrival",
    "current_transcript": "You're now standing at the base of Coit Tower...",
    "previous_transcripts": [
      "Welcome to San Francisco...",
      "As you head north on..."
    ],
    "current_location": { "lat": 37.8024, "lng": -122.4058 },
    "nearby_pois": ["Coit Tower", "Filbert Steps"]
  }
}
```

**Response:**

```json
{
  "answer": "Coit Tower was completed in 1933...",
  "audio_url": "http://localhost:8000/audio/tour_abc123/qa_1.mp3"
}
```

#### `GET /health` — Health Check

Returns `{"status": "ok"}`.

### 3.3 Strands Agent

The Strands Agent is the core orchestrator. It receives the full tour request, plans the pipeline, and invokes tools sequentially.

```python
# agent/tour_agent.py — conceptual structure
from strands import Agent
from strands.models import BedrockModel
from agent.tools.enrich_poi import enrich_poi
from agent.tools.generate_outline import generate_outline
from agent.tools.generate_segment import generate_segment
from agent.tools.generate_audio import generate_audio

model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
    region_name="us-east-1"
)

tour_agent = Agent(
    model=model,
    tools=[enrich_poi, generate_outline, generate_segment, generate_audio],
    system_prompt="""You are a tour generation agent for AuraMap. Given a walking route
    and selected points of interest, you orchestrate the creation of an audio walking tour.

    Your pipeline:
    1. Enrich each selected POI by calling enrich_poi for each one (can be parallel).
    2. Generate a tour outline by calling generate_outline with the enriched POI data.
    3. For each segment in the outline, sequentially:
       a. Call generate_segment to write the transcript.
       b. Call generate_audio to convert it to speech.

    Always generate segments in order. Pass the previous segment's transcript as context
    to maintain narrative coherence. The first segment (Opening) is highest priority —
    generate it as fast as possible so the user can start listening."""
)
```

**Agent invocation flow:**

```
tour_agent(prompt)
  → Agent calls enrich_poi("Coit Tower")
  → Agent calls enrich_poi("Transamerica Pyramid")     [parallel if Strands supports]
  → Agent calls generate_outline(enriched_pois, route_data)
  → Agent calls generate_segment(outline, segment_1_data, previous_transcript=None)
  → Agent calls generate_audio(segment_1_transcript)    → SSE push segment 1
  → Agent calls generate_segment(outline, segment_2_data, previous_transcript=seg1)
  → Agent calls generate_audio(segment_2_transcript)    → SSE push segment 2
  → ... continues until all segments generated
```

### 3.4 Agent Tool Definitions

Each tool is a Python function decorated with `@tool` from the Strands SDK.

#### `enrich_poi`

```
Input:  place_id (str), name (str), lat (float), lng (float)
Output: EnrichedPOI (name, description, history, stories, rating, reviews_summary)

Steps:
1. Call Google Places Details API (place_id) → reviews, editorial_summary, rating
2. Call Tavily Search API (query: "{name} history stories facts") → top 3 results
3. Return combined enriched profile
```

#### `generate_outline`

```
Input:  enriched_pois (list), route_data (legs, distances, walk times), voice_id
Output: TourOutline JSON

Steps:
1. Calculate target duration per segment using walk times + calibration rule (85%)
2. Calculate target word counts (150 words/min)
3. Call Bedrock Claude with outline prompt + all context
4. Parse and return structured JSON outline
```

#### `generate_segment`

```
Input:  outline (TourOutline), segment_index (int), enriched_poi (optional),
        previous_transcript (optional), target_word_count (int)
Output: SegmentTranscript (text, segment_type, label)

Steps:
1. Build prompt with: outline context, segment-specific instructions, POI data (if POI segment),
   previous transcript, target word count
2. Call Bedrock Claude
3. Return transcript text
```

#### `generate_audio`

```
Input:  transcript (str), voice_id (str), tour_id (str), segment_id (int)
Output: audio_url (str), duration_s (float)

Steps:
1. Call MiniMax TTS API with transcript + voice_id
2. Save MP3 to audio_cache/{tour_id}/segment_{segment_id}.mp3
3. Return local URL path + duration
```

---

## 4. Tour Outline JSON Schema

The outline is the structural plan generated before any segment transcripts. It ensures narrative coherence across the full tour.

```json
{
  "tour_id": "abc123",
  "theme": "San Francisco's architectural ambition — from Gold Rush rebuilds to modern icons",
  "tone": "warm, curious, conversational — like a knowledgeable friend",
  "arc": "Discovery → awe → reflection",
  "segments": [
    {
      "segment_id": 1,
      "type": "opening",
      "label": "Welcome to Your Tour",
      "target_duration_s": 30,
      "target_word_count": 75,
      "key_themes": ["neighborhood overview", "what to expect", "set the mood"],
      "transition_hook": "Lead into anticipation for the first landmark"
    },
    {
      "segment_id": 2,
      "type": "transit",
      "label": "Walking to Coit Tower",
      "target_duration_s": 120,
      "target_word_count": 300,
      "key_themes": [
        "Telegraph Hill neighborhood",
        "street-level observations",
        "build anticipation"
      ],
      "transition_hook": "As the tower comes into view above the trees..."
    },
    {
      "segment_id": 3,
      "type": "poi_arrival",
      "poi_name": "Coit Tower",
      "label": "Coit Tower",
      "target_duration_s": 75,
      "target_word_count": 185,
      "key_themes": [
        "Lillie Hitchcock Coit",
        "the 1933 murals",
        "panoramic views"
      ],
      "story_angle": "The eccentric heiress who loved firefighters",
      "transition_hook": "Carry the theme of individual passion shaping the city"
    },
    {
      "segment_id": 4,
      "type": "outro",
      "label": "Heading to the Ferry Building",
      "target_duration_s": 75,
      "target_word_count": 185,
      "key_themes": [
        "final stretch narration",
        "tie themes together",
        "farewell"
      ],
      "transition_hook": null
    }
  ]
}
```

---

## 5. Frontend Architecture

### 5.1 Single-Screen Architecture

The entire app is a **single screen** (`app/index.tsx`) with a full-screen map and a transforming bottom card. There is no multi-screen navigation — the app uses **state-driven card transitions** instead.

**Route files** in `app/`:

| File              | Route | Purpose                                      |
| ----------------- | ----- | -------------------------------------------- |
| `app/_layout.tsx` | —     | Root layout (headerless, single screen)      |
| `app/index.tsx`   | `/`   | The entire app: map + bottom card system     |

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
```

### 5.1.1 App Phases (State Machine)

The app has four phases, driven by a `phase` state in `useAppStore`:

```
ROUTE_SETUP → ROUTE_CUSTOMIZATION → TOUR_LOADING → TOUR_PLAYBACK
                                                          ↓
                                                  (reset → ROUTE_SETUP)
```

| Phase                  | Map State                          | Card State                                              |
| ---------------------- | ---------------------------------- | ------------------------------------------------------- |
| `ROUTE_SETUP`          | Search bar visible, no route       | No card visible                                         |
| `ROUTE_CUSTOMIZATION`  | Route polyline + POI markers       | Pull-up route card (summary, Direct/Scenic, Start Tour) |
| `TOUR_LOADING`         | Route polyline + POI markers       | Outline card with loading bars + disabled Play button   |
| `TOUR_PLAYBACK`        | Route polyline + POI markers       | Swipeable: outline card ↔ audio player card             |

### 5.1.2 Bottom Card System

The bottom card uses a **pull-up sheet** pattern (similar to Apple/Google Maps):

- **Collapsed (peek):** Shows ~120px of card content at screen bottom
- **Half-expanded:** Card takes ~50% of screen (for editing stops)
- **Collapsed during playback:** Card shows audio controls in compact mode

During `TOUR_PLAYBACK`, the card content becomes a **horizontally swipeable container** with two pages:

- **Page 1 (left):** Tour outline with section progress states
- **Page 2 (right):** Audio player with karaoke transcript

The audio player card slides in from the right when Play is tapped, and the user can freely swipe between the two cards.

### 5.2 Zustand Stores

#### `useAppStore`

Top-level store managing the app phase state machine.

```typescript
type AppPhase = "ROUTE_SETUP" | "ROUTE_CUSTOMIZATION" | "TOUR_LOADING" | "TOUR_PLAYBACK";

interface AppStore {
  // State
  phase: AppPhase;
  routeMode: "direct" | "scenic"; // Direct vs Scenic toggle

  // Actions
  setPhase: (phase: AppPhase) => void;
  setRouteMode: (mode: "direct" | "scenic") => void;
  resetToSetup: () => void; // Full reset back to ROUTE_SETUP
}
```

#### `useRouteStore`

```typescript
interface RouteStore {
  // State
  startLocation: Location | null;
  endLocation: Location | null;
  polyline: LatLng[]; // Decoded polyline coordinates
  encodedPolyline: string | null;
  totalDistanceM: number;
  totalDurationS: number;
  legs: RouteLeg[]; // Per-leg distance/duration after POI waypoints
  discoveredPOIs: POI[]; // 5-7 POIs from Nearby Search
  selectedPOIIds: Set<string>; // place_ids of selected POIs (max 3-4)
  stops: POI[]; // Ordered list of stops for the tour (editable)

  // Actions
  setStart: (location: Location) => void;
  setEnd: (location: Location) => void;
  setRoute: (polyline: string, distance: number, duration: number) => void;
  setDiscoveredPOIs: (pois: POI[]) => void;
  togglePOI: (placeId: string) => void;
  addStop: (poi: POI) => void;
  removeStop: (placeId: string) => void;
  reorderStops: (fromIndex: number, toIndex: number) => void;
  updateLegs: (legs: RouteLeg[]) => void;
  clearRoute: () => void;
}
```

#### `useTourStore`

```typescript
interface Segment {
  id: number;
  type: "opening" | "transit" | "poi_arrival" | "outro";
  label: string;
  status: "pending" | "generating" | "ready" | "playing" | "completed";
  audioUrl: string | null;
  transcript: string | null;
  durationS: number | null;
}

interface TourStore {
  // State
  tourId: string | null;
  segments: Segment[];
  generationPhase: string | null; // "enriching_pois", "generating_outline", etc.
  isGenerating: boolean;
  isComplete: boolean;
  error: string | null;

  // Actions
  startGeneration: (tourId: string) => void;
  setPhase: (phase: string) => void;
  addSegment: (segment: Segment) => void;
  updateSegmentStatus: (id: number, status: Segment["status"]) => void;
  setComplete: () => void;
  setError: (error: string) => void;
  reset: () => void;
}
```

#### `usePlaybackStore`

```typescript
interface PlaybackStore {
  // State
  isPlaying: boolean;
  currentSegmentId: number | null;
  currentPositionMs: number; // Position within current segment
  totalElapsedMs: number; // Total tour elapsed time
  activeCard: "outline" | "player"; // Which swipeable card is visible

  // Actions
  play: () => void;
  pause: () => void;
  skipToNext: () => void;
  updatePosition: (ms: number) => void;
  setActiveCard: (card: "outline" | "player") => void;
  reset: () => void;
}
```

### 5.3 Key Frontend Services

#### `directionsService.ts` — Client-Direct Route Calculation

Called whenever the user sets start + end (`/` index screen) and whenever a POI is toggled (`/poi-customization`). Uses Google Directions API directly from the client.

```typescript
async function getWalkingRoute(
  origin: LatLng,
  destination: LatLng,
  waypoints?: LatLng[], // Selected POIs as intermediate stops
): Promise<{
  polyline: string; // Encoded polyline
  decodedPath: LatLng[];
  totalDistanceM: number;
  totalDurationS: number;
  legs: RouteLeg[];
}>;
```

**Route recalculation on POI toggle:** When a POI is selected/deselected, rebuild the waypoints array from the current `selectedPOIIds`, call `getWalkingRoute` with those waypoints (Google Directions API orders them optimally with `optimize:true`), and update the polyline + legs in `useRouteStore`.

#### `placesService.ts` — POI Discovery

Called once after the initial route is calculated (`/` → `/poi-customization` transition).

```typescript
// Discover POIs along the route
async function discoverPOIs(
  polyline: LatLng[],
  radiusM: number = 200,
  type: string = "tourist_attraction",
): Promise<POI[]>;
```

**Implementation approach:** Sample 3-5 evenly spaced points along the polyline, call Google Places Nearby Search at each point with 200m radius, deduplicate results by `place_id`, sort by distance to route, return top 5-7.

#### `sseService.ts` — SSE Client

```typescript
function connectToTourStream(
  tourRequest: TourRequest,
  callbacks: {
    onStatus: (phase: string, message: string) => void;
    onSegment: (segment: SegmentData) => void;
    onComplete: (data: CompleteData) => void;
    onError: (error: string) => void;
  },
): { close: () => void };
```

Uses an `EventSource` polyfill (React Native doesn't support native `EventSource`). Since `EventSource` only supports GET, and we need to POST a request body, the implementation will use `fetch` with `ReadableStream` to consume the SSE response from a POST endpoint.

#### `karaokeSync.ts` — Word-Level Transcript Highlighting

Synchronizes word highlighting in the transcript with audio playback position.

```typescript
interface KaraokeWord {
  word: string;
  startMs: number; // Estimated start time within segment
  endMs: number;   // Estimated end time within segment
}

// Estimate word timings from transcript + segment duration
function estimateWordTimings(transcript: string, durationMs: number): KaraokeWord[];

// Given current playback position, return index of the active word
function getActiveWordIndex(words: KaraokeWord[], positionMs: number): number;
```

**How sync works:**

1. When a segment's transcript is received, estimate per-word timing by distributing words evenly across the segment duration (simple linear model — ~150 words/min).
2. Every ~33ms, read the current playback position from `expo-av`.
3. Calculate the active word index and update the highlighted word in the `KaraokeTranscript` component.
4. The transcript view auto-scrolls to keep the highlighted word visible.

### 5.4 Audio Playback Logic

Uses `expo-av` `Audio.Sound` for segment playback.

```
Playback state machine:

IDLE → (first segment ready) → PLAYING → (segment ends) → WAITING
  WAITING → (next segment ready) → PLAYING
  WAITING → (next segment not ready) → BUFFERING → (segment arrives) → PLAYING
  PLAYING → (user taps pause) → PAUSED → (user taps play) → PLAYING
  PLAYING → (user taps skip) → [unload current, load next] → PLAYING
  PLAYING → (last segment ends) → COMPLETE
```

When a segment finishes playing:

1. Mark current segment as `completed`.
2. Check if next segment status is `ready`.
3. If ready: wait 2-3 seconds (brief pause), then start next segment.
4. If not ready: show a small loading indicator (rare after segment 1).

Audio preloading: When segment N starts playing, preload segment N+1 if it's `ready`.

Karaoke sync: When a segment starts playing, the `KaraokeTranscript` component receives the transcript text and segment duration. It estimates per-word timings and highlights words in real-time based on the playback position polled at ~33ms intervals.

---

## 6. External API Integration Details

### 6.1 Google Directions API (Client-Side)

```
GET https://maps.googleapis.com/maps/api/directions/json
  ?origin={lat},{lng}
  &destination={lat},{lng}
  &waypoints=optimize:true|{poi1_lat},{poi1_lng}|{poi2_lat},{poi2_lng}
  &mode=walking
  &key={GOOGLE_MAPS_API_KEY}
```

Response provides: `routes[0].overview_polyline.points` (encoded polyline), `legs[]` with distance/duration per leg, and `waypoint_order` for optimized ordering.

### 6.2 Google Places Nearby Search (Client-Side)

```
GET https://maps.googleapis.com/maps/api/place/nearbysearch/json
  ?location={lat},{lng}
  &radius=200
  &type=tourist_attraction
  &key={GOOGLE_MAPS_API_KEY}
```

Called at 3-5 points along the polyline. Results are deduped by `place_id` and capped at 7.

### 6.3 Google Places Details (Backend — `enrich_poi` Tool)

```
GET https://maps.googleapis.com/maps/api/place/details/json
  ?place_id={place_id}
  &fields=name,editorial_summary,reviews,rating,formatted_address,types
  &key={GOOGLE_MAPS_API_KEY}
```

### 6.4 Tavily Search API (Backend — `enrich_poi` Tool)

```python
from tavily import TavilyClient

tavily_client = TavilyClient(api_key="{TAVILY_API_KEY}")

response = tavily_client.search(
    query="{poi_name} San Francisco history stories interesting facts",
    max_results=3,
    search_depth="basic"
)
# response["results"] contains list of {title, url, content, score}
```

### 6.5 Amazon Bedrock — Claude (Backend — `generate_outline` + `generate_segment` Tools)

```python
import boto3

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

response = bedrock.invoke_model(
    modelId="us.anthropic.claude-sonnet-4-20250514-v1:0",
    contentType="application/json",
    accept="application/json",
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "system": system_prompt
    })
)
```

Model choice: **Claude Sonnet** for speed. Outline generation and segment generation both use Sonnet — quality is sufficient for narrative content and latency is ~2-3x faster than Opus.

### 6.6 MiniMax TTS (Backend — `generate_audio` Tool)

```
POST https://api.minimaxi.chat/v1/t2a_v2
Headers:
  Authorization: Bearer {MINIMAX_API_KEY}
  Content-Type: application/json

Body:
{
  "model": "speech-02-hd",
  "text": "{transcript_text}",
  "voice_setting": {
    "voice_id": "English_CalmWoman"
  },
  "audio_setting": {
    "format": "mp3",
    "sample_rate": 32000
  }
}
```

Response includes base64-encoded audio or a URL. Save decoded MP3 to `audio_cache/{tour_id}/segment_{id}.mp3`.

---

## 7. Karaoke Transcript Synchronization

The karaoke-style transcript highlighting is the primary visual feedback during playback (no animated map marker for MVP).

### Word Timing Estimation

Since MiniMax TTS doesn't return per-word timestamps, estimate timings using a linear distribution model:

```typescript
function estimateWordTimings(transcript: string, durationMs: number): KaraokeWord[] {
  const words = transcript.split(/\s+/);
  const msPerWord = durationMs / words.length;
  return words.map((word, i) => ({
    word,
    startMs: Math.floor(i * msPerWord),
    endMs: Math.floor((i + 1) * msPerWord),
  }));
}
```

This is approximate but sufficient for a demo — the visual feedback feels natural even if word boundaries are slightly off.

### Sync Mechanism

The audio player (`expo-av`) is the source of truth. Every ~33ms, read the current playback position from `expo-av` and determine which word should be highlighted.

```
Given playback position P within current segment:
1. Binary search KaraokeWord[] for entry where startMs <= P < endMs
2. Set that word index as active → KaraokeTranscript highlights it
3. Auto-scroll the transcript view to keep the active word centered
```

When the user pauses → highlighting freezes on the current word.
When the user skips → transcript resets to the first word of the next segment.

---

## 8. Prompt Engineering

### 8.1 Outline Generation Prompt

```
System: You are a creative tour guide narrative planner. You design compelling, coherent
audio walking tour outlines for the AuraMap app. Your outlines are structured JSON that
will guide transcript generation for each segment.

User: Create a tour outline for this walking route:

Route: {start_name} → {end_name}
Total distance: {total_distance_m}m, estimated walk time: {total_duration_s}s
Number of legs: {num_legs}

Selected points of interest:
{for each POI: name, enriched description, key stories, rating}

Leg details:
{for each leg: start, end, distance, walk time}

Requirements:
- Generate a JSON outline following this exact schema: {schema}
- Theme: Find one connecting thread across all POIs and the route
- Tone: Warm, curious, conversational — like a knowledgeable friend, not a textbook
- Each segment must have key_themes and a transition_hook to the next segment
- Target word counts are calculated from walk times at 150 words/minute
- Transit segments should fill ~85% of walking time (leave breathing room)
- Story angles for POIs: pick ONE compelling story per POI, not a list of facts
```

### 8.2 Segment Generation Prompt

```
System: You are a tour guide narrator for the AuraMap app. You write audio transcripts
that will be converted to speech. Write in second person ("you"). Be vivid and specific.
One story per POI, told well. Transit segments build anticipation. Your tone is warm
and conversational.

User: Write the transcript for segment {segment_id} of this tour.

Tour outline:
{full outline JSON}

This segment:
- Type: {type}
- Label: {label}
- Target word count: {target_word_count} words (IMPORTANT: stay within ±10%)
- Key themes: {key_themes}
- Transition hook: {transition_hook}

{if POI segment}
POI data:
{enriched POI profile — description, history, stories, reviews}
{/if}

{if previous_transcript}
Previous segment transcript (maintain voice continuity):
"{previous_transcript}"
{/if}

Write ONLY the transcript text. No stage directions, no headers, no metadata.
The text will be spoken directly by a TTS voice.
```

---

## 9. Datadog Observability

### 9.1 Setup

```python
# main.py — top of file, before FastAPI init
from ddtrace import tracer, patch_all

patch_all()  # Auto-instruments FastAPI, httpx, boto3

tracer.configure(
    hostname="localhost",  # Local Datadog agent
    port=8126,
)
```

Run the Datadog agent locally:

```bash
DD_API_KEY=<key> DD_SITE=datadoghq.com datadog-agent run
```

### 9.2 Manual Spans for Agent Tools

Each Strands tool invocation gets a manual span for granular tracing:

```python
from ddtrace import tracer

@tool
def enrich_poi(place_id: str, name: str, lat: float, lng: float):
    with tracer.trace("agent.tool.enrich_poi", service="auramap") as span:
        span.set_tag("poi.name", name)
        span.set_tag("poi.place_id", place_id)

        # Google Places call (auto-instrumented by httpx patch)
        places_data = await google_places_details(place_id)

        # Tavily call (auto-instrumented by httpx patch)
        tavily_data = await tavily_search(f"{name} history")

        result = combine_enrichment(places_data, tavily_data)
        span.set_tag("poi.enrichment_sources", len(tavily_data.results))
        return result
```

### 9.3 Key Metrics to Emit

```python
from datadog import statsd

# Time-to-first-audio (most important UX metric)
statsd.timing("auramap.time_to_first_audio", first_segment_ready_ms)

# Per-segment generation latency
statsd.timing("auramap.segment.generation_latency", segment_gen_ms, tags=[f"type:{seg_type}"])

# LLM token usage
statsd.increment("auramap.llm.input_tokens", input_tokens, tags=[f"tool:{tool_name}"])
statsd.increment("auramap.llm.output_tokens", output_tokens, tags=[f"tool:{tool_name}"])

# Tour generation total cost (estimated)
statsd.gauge("auramap.tour.estimated_cost_usd", total_cost)

# External API latencies (auto-captured by ddtrace httpx integration, but explicit is clearer)
statsd.timing("auramap.api.google_places", places_latency_ms)
statsd.timing("auramap.api.tavily", tavily_latency_ms)
statsd.timing("auramap.api.minimax_tts", tts_latency_ms)
statsd.timing("auramap.api.bedrock", bedrock_latency_ms, tags=[f"tool:{tool_name}"])
```

### 9.4 Dashboard Layout

The Datadog dashboard tells a story in four sections:

| Section             | Widgets                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **User Experience** | Time-to-first-audio (gauge), tour generation total time (timeseries)                          |
| **Agent Pipeline**  | Flame graph / trace waterfall showing the full agent trace with all tool invocations          |
| **LLM Performance** | Token usage (input vs output, stacked bar), Bedrock latency per call, estimated cost per tour |
| **External APIs**   | Response time heatmaps for Google Places, Tavily, MiniMax TTS                                 |

---

## 10. Golden Path Fallback

### Pre-Hackathon Preparation

Before the hackathon, generate one complete tour for the golden path route:

- **Route:** Hackathon venue → SF Ferry Building
- **POIs:** 1-2 historical landmarks (e.g., Transamerica Pyramid, Coit Tower)
- **Assets to cache:**
  - `golden_path/tour_data.json` — full tour metadata (route, POIs, segments, outline, transcripts)
  - `golden_path/audio/segment_*.mp3` — all audio files

### Fallback Trigger

In the `/tour/generate` endpoint, wrap the agent invocation in a try/except with a timeout:

```python
try:
    async with asyncio.timeout(30):  # 30s total timeout for full pipeline
        await run_agent_pipeline(request, sse_queue)
except (asyncio.TimeoutError, Exception) as e:
    logger.error(f"Agent pipeline failed: {e}")
    await serve_golden_path(sse_queue)
```

`serve_golden_path` streams the pre-cached segments via the same SSE event format, with a small artificial delay between events to simulate generation. The client can't tell the difference.

### Mid-Tour Segment Skip

If a single segment fails (timeout > 10s or generation error), skip it:

```python
for segment in outline.segments:
    try:
        async with asyncio.timeout(10):
            transcript = await generate_segment(...)
            audio = await generate_audio(...)
            await sse_queue.put(segment_event)
    except (asyncio.TimeoutError, Exception):
        logger.warning(f"Skipping segment {segment.id}")
        continue  # Move to next segment
```

---

## 11. Networking (Local Development)

Since the backend runs locally and the frontend runs on Expo Go (on a phone), the phone needs to reach the laptop.

### Setup

1. Run backend: `uvicorn main:app --host 0.0.0.0 --port 8000`
2. Find laptop's local IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. Set `API_BASE_URL` in the frontend to `http://<laptop-ip>:8000`
4. Ensure both devices are on the same WiFi network

**Alternative (more reliable):** Use `ngrok http 8000` to get a public URL. This avoids WiFi firewall issues common at conference venues. Set `API_BASE_URL` to the ngrok URL.

For the hackathon, **use ngrok** — conference WiFi often blocks local network traffic between devices.

---

## 12. Stretch Features (If Time Permits)

Ordered by impact and effort:

| Priority | Feature                  | Effort  | Notes                                                                                        |
| -------- | ------------------------ | ------- | -------------------------------------------------------------------------------------------- |
| 1        | **Q&A during tour**      | ~45 min | `POST /tour/{id}/ask`, direct Bedrock call with context, TTS response. High demo wow-factor. |
| 2        | **Voice selection**      | ~20 min | Dropdown on Screen 1, pass `voice_id` through to backend. Already parameterized.             |
| 3        | **Ambient music buffer** | ~30 min | MiniMax Music API for background track. Requires investigating the API.                      |

---

## 13. Build Order (Suggested)

Suggested sequencing for the 6-hour hackathon:

| Phase                              | Time      | What to Build                                                                                                                                                    |
| ---------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Backend skeleton**            | 0:00–0:45 | FastAPI app, config, models, health endpoint, static file serving, SSE endpoint shell                                                                            |
| **2. Agent pipeline**              | 0:45–2:15 | Strands agent + all 4 tools (`enrich_poi`, `generate_outline`, `generate_segment`, `generate_audio`). Test end-to-end with curl/httpie against the SSE endpoint. |
| **3. Frontend: Map + Route Setup** | 2:15–3:15 | Single-screen map, search bar, route polyline, POI markers, bottom card with route summary + Direct/Scenic toggle, expandable stop editor.                       |
| **4. Frontend: Tour + Playback**   | 3:15–4:45 | SSE connection, outline card with loading bars, swipeable card system, audio player card, karaoke transcript highlighting, playback controls.                     |
| **5. Golden path**                 | 4:45–5:15 | Pre-generate and cache one complete tour. Wire up fallback logic. Safety net for the demo.                                                                       |
| **6. Datadog**                     | 5:15–5:45 | `ddtrace` setup, manual spans, custom metrics, build the dashboard.                                                                                              |
| **7. Polish + stretch**            | 5:45–6:00 | UI polish, test on Expo Go, attempt stretch features if ahead of schedule.                                                                                       |

---

## 14. Pydantic Models (Backend)

Core data models shared across the backend:

```python
# models/tour.py
from pydantic import BaseModel

class Location(BaseModel):
    lat: float
    lng: float
    name: str

class POI(BaseModel):
    place_id: str
    name: str
    lat: float
    lng: float
    types: list[str] = []
    rating: float | None = None

class EnrichedPOI(POI):
    description: str
    history: str
    stories: list[str]
    reviews_summary: str

class RouteLeg(BaseModel):
    start_name: str
    end_name: str
    distance_m: int
    duration_s: int

class TourSegment(BaseModel):
    segment_id: int
    type: str  # "opening", "transit", "poi_arrival", "outro"
    label: str
    target_duration_s: int
    target_word_count: int
    key_themes: list[str]
    transition_hook: str | None = None
    story_angle: str | None = None
    poi_name: str | None = None

class TourOutline(BaseModel):
    tour_id: str
    theme: str
    tone: str
    arc: str
    segments: list[TourSegment]

class GeneratedSegment(BaseModel):
    segment_id: int
    type: str
    label: str
    transcript: str
    audio_url: str
    duration_s: float
```

```python
# models/requests.py
class TourGenerateRequest(BaseModel):
    route: RouteData
    selected_pois: list[POI]
    legs: list[RouteLeg]
    voice_id: str = "English_CalmWoman"

class RouteData(BaseModel):
    start: Location
    end: Location
    polyline: str
    total_distance_m: int
    total_duration_s: int

class TourAskRequest(BaseModel):
    question: str
    context: TourAskContext

class TourAskContext(BaseModel):
    current_segment_id: int
    current_segment_type: str
    current_transcript: str
    previous_transcripts: list[str]
    current_location: dict  # {lat, lng}
    nearby_pois: list[str]
```

---

## 15. TypeScript Types (Frontend)

```typescript
// types/index.ts

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Location {
  lat: number;
  lng: number;
  name: string;
}

export interface POI {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  types: string[];
  rating: number | null;
}

export interface RouteLeg {
  start_name: string;
  end_name: string;
  distance_m: number;
  duration_s: number;
}

export interface Segment {
  id: number;
  type: "opening" | "transit" | "poi_arrival" | "outro";
  label: string;
  status: "pending" | "generating" | "ready" | "playing" | "completed";
  audioUrl: string | null;
  transcript: string | null;
  durationS: number | null;
}

export interface TourGenerateRequest {
  route: {
    start: Location;
    end: Location;
    polyline: string;
    total_distance_m: number;
    total_duration_s: number;
  };
  selected_pois: POI[];
  legs: RouteLeg[];
  voice_id: string;
}

// SSE event payloads
export interface SSEStatusEvent {
  phase: string;
  message: string;
}

export interface SSESegmentEvent {
  segment_id: number;
  type: string;
  label: string;
  audio_url: string;
  transcript: string;
  duration_s: number;
}

export interface SSECompleteEvent {
  tour_id: string;
  total_segments: number;
  total_duration_s: number;
}
```
