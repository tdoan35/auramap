# AuraMap — Product Spec (Hackathon MVP)

> **Status:** Living Document — v0.4 (All product decisions resolved)  
> **Last Updated:** 2026-02-19  
> **Context:** AWS x Anthropic x Datadog Hackathon (SF, one-day build, ~6 hours hacking)  
> **Author:** Ty

---

## 1. Product Overview

### What is AuraMap?

AuraMap is a mobile app that generates personalized AI-narrated audio walking tours. A user selects a start and end point, customizes which points of interest (POIs) to visit along the route, and receives a cohesive, location-aware audio tour that plays back as they walk — with narration timed to each leg of the journey.

### Hackathon Framing

For the hackathon, AuraMap demonstrates an end-to-end agentic AI pipeline orchestrated by an **AWS Strands Agent**: route planning → POI discovery → content enrichment → narrative generation → text-to-speech — all observable in real-time via a Datadog dashboard. The demo runs on a real phone via Expo Go.

### Target Demo Scenario

A judge picks a start and end point in San Francisco. The app discovers POIs along the route, the judge customizes their stops, and within seconds an AI-narrated audio tour begins playing — synchronized with an animated "you are here" marker walking the route on the map.

---

## 2. User Flow

The app is a **single interactive map screen** with a transforming bottom card that changes based on the current phase of the tour flow. There are no screen transitions — only card state changes.

### Phase 1: Route Setup

The user sees a full-screen map of SF with a **search bar at the top** (Google Places Autocomplete) for selecting a destination. The start location **defaults to the user's current location**.

**Inputs:**

- Destination location (search bar with autocomplete)
- Start location defaults to current location (can be overridden)

**Output:**

- Walking route polyline renders on the map
- **POI markers** appear along and near the route (max **5–7 shown**, within 200m radius)
- The search bar hides
- A **route card** slides up from the bottom of the screen

### Phase 2: Route Customization (Bottom Card — Collapsed)

Once the route is set, a **pull-up card** appears at the bottom showing:

- **Route summary:** Total distance, estimated walk time, number of POIs discovered
- **Route mode toggle:** "Direct" vs "Scenic"
  - **Direct:** Routes straight from start → destination (no POI stops)
  - **Scenic:** Routes from start → all discovered POIs (up to max 3–4) → destination, in logical walking order
- **"Start Tour" button**

**Expanded Card (pulled up to ~50% of screen):**

When the user pulls the card up, it expands to reveal an **editable stop list**:

- List of stops (POIs) along the route
- User can **add stops** (search for additional POIs)
- User can **remove stops** (swipe or tap to remove)
- User can **rearrange stops** (drag to reorder)
- Route recalculates on every change
- Route summary updates live

### Phase 3: Tour Generation (Card Transforms)

When the user taps **"Start Tour"**, the bottom card transforms into a **tour outline card**:

- Shows the **structured outline** of the tour (section titles: Opening, Transit to Coit Tower, Coit Tower, etc.)
- Each section has a **loading bar** showing generation progress
- A **Play button** at the top of the card — initially **disabled**

Under the hood, the **Strands Agent** kicks off:

1. POI enrichment (parallel via `enrich_poi` tool)
2. Tour outline generation (via `generate_outline` tool)
3. Progressive segment generation + TTS (via `generate_segment` + `generate_audio` tools)

Once the **first segment** is ready (~3–5 seconds), the **Play button enables**. Remaining segments generate in the background.

### Phase 4: Tour Playback (Swipeable Cards)

When the user taps the enabled **Play button**, an **audio player card slides in from the right**, pushing the outline card off-screen to the left. The user can **swipe left/right** to switch between:

- **Left card — Tour Outline:** Shows all sections with progress states (completed, playing, generating, pending)
- **Right card — Audio Player:** The primary playback interface

**Audio Player Card:**

- **Transcript text** with **karaoke-style word highlighting** — words highlight as they're spoken
- **Play / Pause** button
- **Skip Forward** button (jump to next segment)
- **Playback progress bar** for current segment
- Current segment label (e.g., "Walking to Coit Tower")

**Map (background, always visible):**

- Full route polyline displayed
- POI markers at selected stops
- Start and destination markers
- User can **freely pan and zoom** during playback

**Playback Behavior:**

- **Auto-advance:** When a segment ends, a brief pause (~2–3 sec), then the next segment begins automatically
- **Skip:** User can skip to the next segment at any time
- **End of tour:** Final outro plays, tour completes, card shows completion state with "Done" button to reset

---

## 3. Demo Playback Mode

Since this is a hackathon demo (judges are standing still, not walking), playback is **audio-driven with a static map** — no animated walking marker for MVP.

- The map displays the full route polyline and POI markers statically
- Audio segments play sequentially with the **transcript highlighted in real-time** (karaoke-style) as the primary visual feedback
- The tour outline card (swipe left) shows which section is currently playing
- No GPS tracking or simulated marker movement

**Timeline Example (2 POIs, ~5 min demo tour):**

| Segment               | Type          | Time Window | Duration |
| --------------------- | ------------- | ----------- | -------- |
| Opening               | Intro         | 0:00 – 0:25 | ~25 sec  |
| Walk to POI 1         | Transit       | 0:25 – 1:30 | ~65 sec  |
| POI 1 Arrival         | POI Deep Dive | 1:30 – 2:30 | ~60 sec  |
| Walk to POI 2         | Transit       | 2:30 – 3:15 | ~45 sec  |
| POI 2 Arrival         | POI Deep Dive | 3:15 – 4:15 | ~60 sec  |
| Walk to End + Closing | Outro         | 4:15 – 5:00 | ~45 sec  |

**Calibration rule:** Transit audio fills ~85% of walking time (leaving breathing room rather than nonstop talking).

---

## 4. Transcript / Audio Structure

### Segment Types

Each tour is composed of an ordered sequence of segments:

| Type            | Purpose                      | Content Style                                                               | Duration                       |
| --------------- | ---------------------------- | --------------------------------------------------------------------------- | ------------------------------ |
| **Opening**     | Sets the scene               | Neighborhood context, what to expect, vibe of the walk                      | 30–45 sec                      |
| **Transit**     | Fills the walk between stops | Street-level observations, neighborhood history, anticipation for next stop | Calibrated to walk time (~85%) |
| **POI Arrival** | Deep dive on a landmark      | "You're now approaching..." — history, stories, what to notice              | 60–90 sec                      |
| **Outro**       | Wraps up the tour            | Final stretch narration, ties themes together, farewell                     | Walk time + 30 sec closing     |

### Narrative Principles

- Second person ("you") — speaks directly to the walker
- One compelling story per POI, told well, rather than a list of facts
- Transit segments build anticipation for the next stop and connect themes from the previous stop
- Coherence maintained via a **tour outline** generated first, then used as context for each segment
- Previous segment transcript is passed as context during sequential generation to maintain voice and flow

### Word Count to Duration Calibration

Approximate target: **~150 words per minute** of TTS audio (calibrate per MiniMax voice during pre-hackathon testing). A 4-minute transit segment targets ~510 words of narration; a 75-second POI segment targets ~185 words.

---

## 5. Generation Pipeline

### Architecture: Strands Agent with Progressive Generation

The tour generation pipeline is orchestrated by a single **AWS Strands Agent** with registered tools for each pipeline step. The agent takes a high-level goal (route + selected POIs), plans the tour, invokes tools to enrich content and generate audio, and streams completed segments to the client. Generation and playback are **decoupled** — the agent races ahead of playback, dropping completed audio segments into an ordered queue.

```
User hits "Start Tour"
  -> Strands Agent receives route + POI data
  -> Agent orchestrates: enrich POIs → generate outline → generate segments + TTS
  -> Completed segments stream to client via SSE
  -> Client plays from queue; agent stays ahead of playback
```

### Agent Tools

The Strands Agent has the following tools registered:

| Tool               | Purpose                                             | Backed By                      |
| ------------------ | --------------------------------------------------- | ------------------------------ |
| `enrich_poi`       | Fetch detailed POI data (reviews, history, stories) | Google Places Details + Tavily |
| `generate_outline` | Create structured JSON tour narrative plan          | Bedrock (Claude)               |
| `generate_segment` | Write transcript for a single tour segment          | Bedrock (Claude)               |
| `generate_audio`   | Convert transcript to speech                        | MiniMax TTS                    |

### Pipeline Steps

**Step 1 — POI Enrichment (parallel, per POI)**

- Agent invokes `enrich_poi` for each selected POI in parallel
- Google Places Details API: reviews, hours, rating, editorial summary
- Tavily Search API: history, stories, fun facts
- Output: Enriched POI profiles

**Step 2 — Tour Outline Generation**

- Agent invokes `generate_outline` with: route geometry, neighborhood context, enriched POI profiles, leg distances/walk times, target word counts per segment
- Output: **Structured JSON** narrative plan — theme, arc, per-segment key themes, transition hooks, and tone

**Step 3 — Sequential Segment Generation + TTS**

- For each segment in order, the agent invokes:
  - `generate_segment` with: tour outline, enriched POI data (if POI segment), previous segment transcript, target word count / duration
  - `generate_audio` to convert transcript to speech
  - SSE push to client: `{ segment_id, audio_url, transcript }`
- Each segment fires as soon as prior completes

### Client-Side Segment Queue

```json
[
  { "id": 1, "type": "opening", "status": "playing", "audio": "<blob>" },
  { "id": 2, "type": "transit", "status": "ready", "audio": "<blob>" },
  { "id": 3, "type": "poi_arrival", "status": "generating", "audio": null },
  { "id": 4, "type": "transit", "status": "pending", "audio": null },
  { "id": 5, "type": "poi_arrival", "status": "pending", "audio": null },
  { "id": 6, "type": "outro", "status": "pending", "audio": null }
]
```

When playback of segment N ends, check if segment N+1 is `"ready"`. If yes, play immediately. If still generating, show a brief loading indicator (should rarely happen after segment 1).

---

## 6. External APIs and Data Sources

| Service                           | Purpose                                                                   | Notes                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **AWS Strands Agents SDK**        | **Agent orchestration — plans and executes the tour generation pipeline** | **Single agent with registered tools; reasoning traces feed into Datadog**                 |
| Google Maps Directions API        | Walking route + polyline between start, POIs, and end                     | Provides leg distances and walk times                                                      |
| Google Places API (Nearby Search) | Discover POIs along/near the route                                        | Filter by type: historical landmarks; 200m radius; return 5–7 nearest                      |
| Google Places API (Details)       | Enriched POI data — reviews, photos, editorial                            | Per selected POI; invoked via agent `enrich_poi` tool                                      |
| Google Places Autocomplete        | Search bar suggestions for start/end locations                            | Powers the address input UX                                                                |
| Tavily Search API                 | Web search for POI history, stories, facts                                | Structured for LLM consumption; invoked via agent `enrich_poi` tool                        |
| Amazon Bedrock (Claude)           | Tour outline + segment transcript generation                              | Invoked via agent `generate_outline` and `generate_segment` tools                          |
| MiniMax TTS                       | Text-to-speech for narration audio                                        | Higher quality voice; targets MiniMax prize track; invoked via agent `generate_audio` tool |
| MiniMax Music                     | Ambient background music for audio buffers                                | Fills gaps between segments when audio finishes before marker reaches next waypoint        |

---

## 7. Observability (Datadog)

Datadog instrumentation is both a hackathon requirement and a key part of the demo. The dashboard tells a story to judges: _"A Strands Agent autonomously planned and generated this tour — it cost $0.08, and the user waited 4 seconds before audio started. Here's every decision the agent made."_

### What to Instrument

- **Full agent trace:** Single trace from "Start Tour" to "last segment delivered," with spans for each agent tool invocation
- **Agent reasoning:** Log the agent's planning steps and tool selection decisions
- **LLM Observability:** Token counts, latency, and estimated cost per Bedrock call (Datadog LLM Monitoring)
- **Per-segment metrics:** Time from generation start to audio delivered to client
- **API response times:** Tavily, Google Places, Google Directions, MiniMax TTS latencies

### Dashboard Metrics

- Total tour generation cost (USD)
- Average segment generation latency
- LLM token usage breakdown (input vs. output per call)
- Time-to-first-audio (user wait time)
- External API response times

---

## 8. Technical Constraints and Decisions

| Decision                                   | Choice                                                                           | Rationale                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Mobile vs. Web                             | Mobile (Expo + React Native via Expo Go)                                         | More memorable demo; judges can scan QR to try it                                            |
| GPS vs. Audio-driven playback              | Audio-driven with static map (no walk animation for MVP)                         | Simpler to build; karaoke transcript is the primary visual feedback                          |
| Single screen vs. Multi-screen             | Single map screen with transforming bottom card                                  | More fluid UX; no jarring screen transitions; map is always visible                          |
| Full transcript vs. Progressive generation | Progressive (segment-by-segment)                                                 | Cuts initial wait from ~15-20s to ~3-5s                                                      |
| Agent orchestration                        | AWS Strands Agents SDK (single agent, multiple tools)                            | Strengthens AWS story; natural fit for pipeline; traces feed Datadog; lighter than AgentCore |
| TTS provider                               | MiniMax TTS                                                                      | Higher quality voice; targets MiniMax prize track                                            |
| LLM provider                               | Amazon Bedrock (Claude)                                                          | Covers AWS requirement; proven for narrative generation                                      |
| Routing/POI provider                       | Google Maps + Google Places                                                      | Most reliable for walking directions; POI data quality                                       |
| Content enrichment                         | Tavily                                                                           | Structured web search optimized for LLM consumption                                          |
| Team size                                  | Solo build                                                                       | Personal challenge                                                                           |
| Pre-build scope                            | Boilerplate, packages, installations, test environments only — no business logic | Per hackathon rules                                                                          |
| POI display cap                            | 5–7 shown on map (nearest to route)                                              | Keeps map clean in dense urban areas                                                         |
| POI selection cap                          | 3–4 max selected per tour                                                        | Keeps generation fast and tour length manageable                                             |
| POI categories                             | Historical landmarks only                                                        | Focused scope; best narrative material                                                       |
| POI discovery radius                       | 200m from route                                                                  | Enough candidates for selection without meandering detours                                   |
| Audio buffer                               | MiniMax Music ambient track                                                      | Pre-generated; fills gaps when audio finishes before marker reaches next waypoint            |
| Tour outline format                        | JSON with per-segment themes and hooks                                           | More structured, predictable, easier to evaluate                                             |
| Segment delivery                           | SSE (Server-Sent Events)                                                         | Simplest real-time delivery; one-directional is sufficient                                   |
| Demo tour length                           | ~5 minutes with 1–2 POIs                                                         | Short enough for judging; long enough to demonstrate the full flow                           |
| Golden path route                          | Hackathon venue → SF Ferry Building (1–2 POIs)                                   | Pre-generated before hackathon; judges can relate to the route                               |

---

## 9. Scope Boundaries

### In Scope (Hackathon MVP)

- Destination selection via **search bar with autocomplete** (start defaults to current location)
- Route display with walking directions on interactive map
- **Single-screen UX** with transforming bottom card (route info → outline → audio player)
- **Direct / Scenic toggle** for route mode selection
- POI discovery along route — **historical landmarks** within 200m, **5–7 displayed**, max 3–4 in scenic mode
- Expandable card for **editing stops** (add, remove, rearrange)
- **AWS Strands Agent** orchestrating the tour generation pipeline
- Progressive transcript generation via **Bedrock (Claude)** — JSON outline then sequential segments
- **Tour outline card** with per-section loading bars during generation
- **MiniMax TTS** audio playback with segment-based controls (play/pause/skip)
- **Karaoke-style transcript highlighting** synced to audio playback
- **Swipeable cards** — outline (left) ↔ audio player (right) during playback
- Free map pan + zoom during all phases
- Pre-cached golden path fallback (hackathon venue → Ferry Building)
- Datadog observability dashboard with **agent trace visibility**

### Out of Scope

- User accounts / authentication
- Saved tours or tour history
- GPS-triggered segment advancement (real walking mode)
- Animated walking marker on map (deferred post-MVP)
- Multiple voice options or voice selection
- Tour sharing
- Offline support / pre-downloaded tours
- Walking speed adjustment or playback speed control
- Multi-language support
- POI photo display in-app
- Social features (reviews, ratings)
- Tour themes or interest-based customization (e.g., "food tour", "history tour")
- Multi-city support
- MiniMax Music ambient background track

---

## 10. Fallback & Error Handling Strategy

Given this is a solo build with ~6 hours, error handling is lightweight with two layers:

**Layer 1: Pre-cached golden path.** Before the hackathon, pre-generate one complete tour for the **hackathon venue → SF Ferry Building** route with 1–2 historical landmark POIs. All segments, audio files, ambient music, and the tour outline are cached and bundled with the app. If anything catastrophically fails during the live demo, the app can seamlessly fall back to this cached tour. The judge won't know the difference.

**Layer 2: Mid-tour graceful skip.** If a single segment's generation fails or times out (>10 seconds), the pipeline skips that segment and advances to the next one. The narration loses one piece but the tour continues without interruption. A brief silence or transition chime covers the gap. No retry logic — not worth the build time for a solo hackathon.

---

## 11. Open Questions

> All product-level questions have been resolved. Remaining questions are technical implementation details to be addressed in the Technical Spec:
>
> - Strands Agent SDK setup: tool registration patterns, error handling within tools, trace propagation to Datadog
> - Exact MiniMax TTS API integration details and voice selection
> - MiniMax Music API for ambient buffer generation
> - SSE implementation specifics (event types, payload format)
> - Datadog instrumentation library choices (dd-trace, custom metrics, agent trace integration)
> - Expo library compatibility testing (react-native-maps, expo-av)
> - Tour outline JSON schema (exact fields and structure)
> - Prompt engineering for transcript generation (per-segment prompts)

---

## 12. Success Criteria

For the hackathon demo, AuraMap succeeds if:

1. **End-to-end flow works live:** Judge selects points, route appears, POIs shown, tour generates, audio plays with synced map animation
2. **Time-to-first-audio < 5 seconds** after hitting "Start Tour"
3. **Narrative quality is compelling:** The audio sounds like a real tour guide, not a Wikipedia article
4. **Datadog dashboard tells a clear story:** Judges can see the full agent trace — every tool invocation, cost, and latency
5. **It feels like a real product:** Polish on the mobile UI makes it feel like something people would actually use
