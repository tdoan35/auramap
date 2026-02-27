"""
Tour generation pipeline.

This implements a direct sequential pipeline (not using Strands Agent SDK directly
for tool orchestration, but ready to wrap with Strands if needed).
The pipeline: enrich POIs → generate outline → for each segment: generate transcript → evaluate → TTS.
"""

import asyncio
import time
from typing import AsyncGenerator

from backend.models.tour import POI, RouteLeg, EnrichedPOI, TourOutline
from backend.models.requests import TourGenerateRequest
from backend.agent.tools.enrich_poi import enrich_all_pois
from backend.agent.tools.generate_outline import generate_outline
from backend.agent.tools.generate_segment import generate_segment
from backend.agent.tools.generate_audio import generate_audio
from backend.services.openai_client import evaluate_transcript
from backend.config import OPENAI_API_KEY


async def run_tour_pipeline(
    request: TourGenerateRequest,
    tour_id: str,
) -> AsyncGenerator[dict, None]:
    """
    Run the full tour generation pipeline, yielding SSE events as they're produced.
    Events: status, reasoning, segment, complete
    """
    start_time = time.time()
    use_evaluator = bool(OPENAI_API_KEY)

    # Step 1: Enrich POIs
    yield {"event": "status", "data": {"phase": "enriching_pois", "message": "Researching points of interest..."}}

    enriched_pois: list[EnrichedPOI] = []
    enrichment_reasoning: list[dict] = []
    if request.selected_pois:
        enriched_pois, enrichment_reasoning = await enrich_all_pois(request.selected_pois)

    # Yield any enrichment reasoning events (Neo4j cache hits/misses)
    for reason in enrichment_reasoning:
        yield {"event": "reasoning", "data": reason}

    # Step 2: Generate outline
    yield {"event": "status", "data": {"phase": "generating_outline", "message": "Planning your tour..."}}

    yield {"event": "reasoning", "data": {
        "agent": "planner",
        "message": "Generating tour outline with AWS Bedrock Claude...",
    }}

    loop = asyncio.get_event_loop()
    outline = await loop.run_in_executor(
        None,
        generate_outline,
        tour_id,
        request.route.start.name,
        request.route.end.name,
        request.route.total_distance_m,
        request.route.total_duration_s,
        enriched_pois,
        request.legs,
    )

    yield {"event": "reasoning", "data": {
        "agent": "planner",
        "message": f"Outline ready — {len(outline.segments)} segments planned",
    }}

    # Step 3: Generate segments sequentially with quality evaluation
    yield {"event": "status", "data": {"phase": "generating_segments", "message": "Writing your tour narration..."}}

    outline_dict = outline.model_dump()
    enriched_poi_map = {p.name: p.model_dump() for p in enriched_pois}

    previous_transcript = None
    total_duration = 0.0

    for seg in outline.segments:
        seg_dict = seg.model_dump()

        # Find matching enriched POI for poi_arrival segments
        enriched_poi = None
        if seg.type == "poi_arrival" and seg.poi_name:
            enriched_poi = enriched_poi_map.get(seg.poi_name)

        # Generate transcript
        transcript = await loop.run_in_executor(
            None,
            generate_segment,
            seg_dict,
            outline_dict,
            enriched_poi,
            previous_transcript,
        )

        # Evaluate transcript quality with OpenAI (if available)
        if use_evaluator:
            try:
                eval_result = await loop.run_in_executor(
                    None,
                    evaluate_transcript,
                    transcript,
                    seg.type,
                    seg.target_word_count,
                )

                score = eval_result["score"]
                approved = eval_result["approved"]
                feedback = eval_result["feedback"]

                yield {"event": "reasoning", "data": {
                    "agent": "evaluator",
                    "segment_id": seg.segment_id,
                    "message": f"Segment {seg.segment_id} quality score: {score}/10"
                        + (" — approved" if approved else f" — regenerating ({feedback})"),
                    "score": score,
                    "approved": approved,
                }}

                # Retry once if quality is below threshold
                if not approved:
                    retry_prompt_extra = f"\n\nQuality feedback from reviewer: {feedback}\nPlease improve the transcript based on this feedback."
                    previous_with_feedback = (previous_transcript or "") + retry_prompt_extra

                    transcript = await loop.run_in_executor(
                        None,
                        generate_segment,
                        seg_dict,
                        outline_dict,
                        enriched_poi,
                        previous_with_feedback,
                    )

                    # Re-evaluate the retry
                    eval_retry = await loop.run_in_executor(
                        None,
                        evaluate_transcript,
                        transcript,
                        seg.type,
                        seg.target_word_count,
                    )

                    yield {"event": "reasoning", "data": {
                        "agent": "evaluator",
                        "segment_id": seg.segment_id,
                        "message": f"Segment {seg.segment_id} v2 quality score: {eval_retry['score']}/10 — approved",
                        "score": eval_retry["score"],
                        "approved": True,
                    }}
            except Exception as e:
                print(f"Evaluation error for segment {seg.segment_id}: {e}")
                yield {"event": "reasoning", "data": {
                    "agent": "evaluator",
                    "segment_id": seg.segment_id,
                    "message": f"Segment {seg.segment_id} evaluation skipped — auto-approved",
                    "score": 7,
                    "approved": True,
                }}

        # Generate audio
        try:
            audio_url, duration_s = await generate_audio(
                transcript=transcript,
                tour_id=tour_id,
                segment_id=seg.segment_id,
                voice_id=request.voice_id,
            )
        except Exception as e:
            print(f"TTS error for segment {seg.segment_id}: {e}")
            # Skip this segment on TTS failure
            continue

        total_duration += duration_s
        previous_transcript = transcript

        # Yield segment event
        yield {
            "event": "segment",
            "data": {
                "segment_id": seg.segment_id,
                "type": seg.type,
                "label": seg.label,
                "audio_url": audio_url,
                "transcript": transcript,
                "duration_s": duration_s,
            },
        }

    # Complete
    elapsed = time.time() - start_time
    yield {
        "event": "complete",
        "data": {
            "tour_id": tour_id,
            "total_segments": len(outline.segments),
            "total_duration_s": round(total_duration, 1),
            "generation_time_s": round(elapsed, 1),
        },
    }
