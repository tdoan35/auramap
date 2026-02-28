"""
City Intelligence Agent — autonomous background loop that:
1. Discovers real-time info about POIs via Tavily
2. Regenerates narratives via Bedrock Claude
3. Self-evaluates quality via OpenAI
4. Stores versioned updates in Neo4j
All activity is broadcast via the EventBus to the web dashboard.
"""

import asyncio
import time
import traceback
from concurrent.futures import ThreadPoolExecutor

from backend.agent.event_bus import EventBus
from backend.services.neo4j_client import (
    get_all_pois,
    store_poi_knowledge_versioned,
    is_available as neo4j_available,
)
from backend.services.tavily_client import search_poi_info
from backend.services.bedrock_client import invoke_claude
from backend.services.openai_client import evaluate_transcript

DISCOVERY_INTERVAL_S = 60
POIS_PER_CYCLE = 2
STALENESS_THRESHOLD_S = 300

_executor = ThreadPoolExecutor(max_workers=3)
_running = False


async def _run_sync(fn, *args):
    """Run a synchronous function in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, fn, *args)


async def run_discovery_cycle(bus: EventBus):
    """One cycle: pick stalest POIs, research, regenerate, evaluate."""
    bus.emit("discovery", "cycle_start")

    pois = await _run_sync(get_all_pois)
    if not pois:
        bus.emit("discovery", "no_pois", details={"message": "No POIs in knowledge graph"})
        return

    # Sort by updated_at (oldest first) to pick stalest
    pois.sort(key=lambda p: p.get("updated_at", 0))
    targets = pois[:POIS_PER_CYCLE]

    for poi in targets:
        poi_name = poi["name"]
        try:
            await _discover_and_update(bus, poi_name, poi)
        except Exception as e:
            bus.emit(
                "system",
                "error",
                poi_name=poi_name,
                details={"error": str(e), "traceback": traceback.format_exc()[-300:]},
            )

    bus.emit("discovery", "cycle_complete", details={"pois_processed": len(targets)})


async def _discover_and_update(bus: EventBus, poi_name: str, current_poi: dict):
    """Full pipeline for one POI: search → regenerate → evaluate → store."""

    # Step 1: Tavily research
    bus.emit("discovery", "searching", poi_name=poi_name)
    search_result = await _run_sync(search_poi_info, poi_name, "San Francisco")
    new_stories = search_result.get("stories", [])
    new_history = search_result.get("history", "")

    bus.emit(
        "discovery",
        "search_complete",
        poi_name=poi_name,
        details={"stories_found": len(new_stories), "history_length": len(new_history)},
    )

    # Step 2: Generate new narrative via Bedrock Claude
    bus.emit("regenerator", "generating", poi_name=poi_name)

    old_narrative = current_poi.get("narrative", "") or current_poi.get("description", "")
    prompt = f"""You are a world-class tour guide narrator for San Francisco.

Write a compelling 100-150 word narrative about {poi_name} that a walking tour guide would tell visitors.
Weave in historical facts, interesting stories, and sensory details.

Use these research sources:
- Description: {current_poi.get('description', '')}
- History: {new_history or current_poi.get('history', '')}
- Stories: {'; '.join(new_stories) if new_stories else '; '.join(current_poi.get('stories', []))}

Make it engaging, conversational, and vivid. Write ONLY the narrative text, nothing else."""

    new_narrative = await _run_sync(invoke_claude, prompt)

    bus.emit(
        "regenerator",
        "narrative_generated",
        poi_name=poi_name,
        details={"word_count": len(new_narrative.split()), "preview": new_narrative[:150]},
    )

    # Step 3: Evaluate with OpenAI — compare old vs new
    bus.emit("evaluator", "evaluating", poi_name=poi_name)

    new_eval = await _run_sync(
        evaluate_transcript, new_narrative, "poi_narrative", 130
    )
    new_score = new_eval.get("score", 7)

    eval_details = {
        "new_score": new_score,
        "feedback": new_eval.get("feedback", ""),
        "approved": new_eval.get("approved", True),
    }

    # If we have an old narrative, evaluate it too for comparison
    if old_narrative and len(old_narrative) > 50:
        old_eval = await _run_sync(
            evaluate_transcript, old_narrative, "poi_narrative", 130
        )
        old_score = old_eval.get("score", 5)
        eval_details["old_score"] = old_score
        eval_details["improvement"] = new_score - old_score
        keep_new = new_score >= old_score
    else:
        keep_new = True
        eval_details["old_score"] = 0
        eval_details["improvement"] = new_score

    bus.emit("evaluator", "evaluation_complete", poi_name=poi_name, details=eval_details)

    # Step 4: Store versioned update in Neo4j (keep winner)
    if keep_new:
        updated_data = {
            "description": current_poi.get("description", ""),
            "history": new_history or current_poi.get("history", ""),
            "stories": new_stories if new_stories else current_poi.get("stories", []),
            "narrative": new_narrative,
            "quality_score": new_score,
        }
        success = await _run_sync(store_poi_knowledge_versioned, poi_name, updated_data)
        bus.emit(
            "regenerator",
            "knowledge_updated",
            poi_name=poi_name,
            details={"version": current_poi.get("version", 1) + 1, "stored": success},
        )
    else:
        bus.emit(
            "evaluator",
            "kept_existing",
            poi_name=poi_name,
            details={"reason": "Old narrative scored higher", **eval_details},
        )


async def start_agent_loop():
    """Main entry point — runs forever in the background."""
    global _running
    _running = True
    bus = EventBus.get()

    bus.emit("system", "agent_started", details={"interval_s": DISCOVERY_INTERVAL_S})

    # Wait a moment for startup to settle
    await asyncio.sleep(3)

    while _running:
        try:
            if not neo4j_available():
                bus.emit("system", "neo4j_unavailable", details={
                    "message": "Neo4j not connected — skipping cycle"
                })
            else:
                await run_discovery_cycle(bus)
        except Exception as e:
            bus.emit("system", "error", details={
                "error": str(e),
                "traceback": traceback.format_exc()[-300:],
            })

        await asyncio.sleep(DISCOVERY_INTERVAL_S)


def stop_agent():
    """Signal the agent loop to stop."""
    global _running
    _running = False
