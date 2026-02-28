# AuraMap

AI-narrated audio walking tours with an autonomous, self-improving city intelligence agent.

Built at the Autonomous Agents Hackathon @ AWS Builder Loft, SF (Feb 2026).

## What It Does

Pick a start and end point, choose direct or scenic, and AuraMap generates a personalized audio tour streamed to your phone in seconds. Karaoke-style transcript highlighting syncs to playback in real-time.

Behind the scenes, a **City Intelligence Agent** runs autonomously — researching POIs, generating narratives, self-evaluating quality, and versioning improvements in a Neo4j knowledge graph. A live dashboard visualizes the agent's decisions as they happen.

## Architecture

```
Mobile App (Expo/React Native)
  |
  | SSE stream
  v
FastAPI Backend
  |
  |-- Tour Pipeline: Tavily research -> LLM outline -> LLM segments -> OpenAI eval -> MiniMax TTS
  |
  |-- City Intelligence Agent: autonomous 60s loop (discover -> generate -> evaluate -> version)
  |
  |-- Neo4j Knowledge Graph: versioned POI narratives
  |
  |-- Live Dashboard: D3 force graph + dual SSE feeds
```

**Single-screen app** — no navigation stack. A transforming bottom card transitions through four phases: Route Setup, Route Customization, Tour Loading, Tour Playback.

## Sponsor Integrations

| Sponsor | Usage |
|---------|-------|
| **Tavily** | Real-time POI discovery and web research |
| **Neo4j** | Versioned knowledge graph for POI narratives |
| **OpenAI** | Quality evaluation loop (compare old vs. new, keep winner) |
| **Fastino Labs** | Llama 3.3 70B for outline + segment generation |
| **MiniMax** | HD text-to-speech (speech-02-hd, English_CalmWoman) |
| **Datadog** | Agent pipeline observability and metrics |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Expo CLI (`npm install -g expo-cli`)

### Environment Variables

```bash
# Backend (.env or export)
GOOGLE_MAPS_API_KEY=...
TAVILY_API_KEY=...
MINIMAX_API_KEY=...
OPENAI_API_KEY=...
NEO4J_URI=...
NEO4J_USERNAME=...
NEO4J_PASSWORD=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-west-2
DD_API_KEY=...          # optional
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Dashboard available at `http://localhost:8000/dashboard/`

For environments where local network is blocked (e.g. conference WiFi):
```bash
ngrok http 8000
```

### Frontend

```bash
npm install
npx expo start
```

Set `API_BASE_URL` in `utils/constants.ts` to your backend URL.

## Project Structure

```
auramap/
├── app/                    # Expo Router screens (single screen)
├── components/             # React Native components
├── stores/                 # Zustand state (app, route, tour, playback)
├── services/               # API clients (SSE, directions, places)
├── hooks/                  # Custom React hooks
├── constants/              # Theme tokens
├── types/                  # Shared TypeScript types
├── utils/                  # Helpers (polyline, karaoke sync)
├── backend/
│   ├── agent/
│   │   ├── tour_agent.py       # On-demand tour generation pipeline
│   │   ├── city_agent.py       # Autonomous background discovery loop
│   │   ├── event_bus.py        # Pub/sub event system
│   │   ├── seed_data.py        # Bootstrap SF POIs into Neo4j
│   │   ├── tools/              # Agent tools (enrich, outline, segment, audio)
│   │   └── prompts/            # LLM prompt templates
│   ├── services/               # External service clients
│   ├── routers/                # FastAPI route handlers
│   ├── dashboard/              # Live agent dashboard (HTML + D3)
│   └── golden_path/            # Pre-cached fallback tour data + audio
└── images/                     # Generated design assets
```

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/tour/generate` | SSE stream of tour segments |
| `GET` | `/agent/feed` | SSE stream of city agent events |
| `GET` | `/agent/tour-feed` | SSE stream of tour generation events |
| `GET` | `/agent/stats` | Agent + knowledge graph stats |
| `GET` | `/agent/pois` | All POIs with knowledge data |
| `GET` | `/health` | Health check |

## License

MIT
