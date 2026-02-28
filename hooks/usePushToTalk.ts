import { useCallback, useEffect, useRef } from "react";
import { usePTTStore } from "@/stores/usePTTStore";
import { useTourStore } from "@/stores/useTourStore";
import { usePlaybackStore } from "@/stores/usePlaybackStore";
import {
  startListening,
  stopListeningAndRespond,
  destroySession,
} from "@/services/realtimeService";

interface UsePushToTalkOptions {
  pauseTourAudio: () => Promise<void>;
  resumeTourAudio: () => Promise<void>;
}

export function usePushToTalk({ pauseTourAudio, resumeTourAudio }: UsePushToTalkOptions) {
  const pttStatus = usePTTStore((s) => s.status);
  const wasPlayingRef = useRef(false);

  // Auto-resume tour audio when PTT goes back to idle
  useEffect(() => {
    if (pttStatus === "idle" && wasPlayingRef.current) {
      wasPlayingRef.current = false;
      resumeTourAudio();
    }
  }, [pttStatus, resumeTourAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroySession();
    };
  }, []);

  const buildTourContext = useCallback(() => {
    const segments = useTourStore.getState().segments;
    const currentSegmentId = usePlaybackStore.getState().currentSegmentId;
    const currentSegment = segments.find((s) => s.id === currentSegmentId);

    return {
      currentSegmentLabel: currentSegment?.label,
      currentTranscript: currentSegment?.transcript ?? undefined,
      nearbyPois: segments
        .filter((s) => s.type === "poi_arrival")
        .map((s) => s.label),
    };
  }, []);

  const onPressIn = useCallback(async () => {
    try {
      // Pause tour audio if playing
      const isPlaying = usePlaybackStore.getState().isPlaying;
      if (isPlaying) {
        wasPlayingRef.current = true;
        await pauseTourAudio();
      }

      await startListening();
    } catch (err: any) {
      console.error("PTT press-in error:", err);
      alert(`PTT Error (press-in): ${err.message}`);
      usePTTStore.getState().setError(err.message ?? "Failed to start listening");
    }
  }, [pauseTourAudio]);

  const onPressOut = useCallback(async () => {
    if (usePTTStore.getState().status !== "listening") return;

    try {
      const ctx = buildTourContext();
      await stopListeningAndRespond(ctx);
    } catch (err: any) {
      console.error("PTT press-out error:", err);
      alert(`PTT Error (press-out): ${err.message}`);
      usePTTStore.getState().setError(err.message ?? "Failed to process question");
    }
  }, [buildTourContext]);

  return { onPressIn, onPressOut, pttStatus };
}
