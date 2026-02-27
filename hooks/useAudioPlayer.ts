import { useRef, useCallback, useEffect } from "react";
import { Audio, AVPlaybackStatusSuccess } from "expo-av";
import { usePlaybackStore } from "@/stores/usePlaybackStore";
import { useTourStore } from "@/stores/useTourStore";
import { SEGMENT_GAP_MS } from "@/utils/constants";

export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentSegmentId = usePlaybackStore((s) => s.currentSegmentId);
  const play = usePlaybackStore((s) => s.play);
  const pause = usePlaybackStore((s) => s.pause);
  const setCurrentSegment = usePlaybackStore((s) => s.setCurrentSegment);
  const updatePosition = usePlaybackStore((s) => s.updatePosition);
  const setActiveCard = usePlaybackStore((s) => s.setActiveCard);

  const segments = useTourStore((s) => s.segments);
  const updateSegmentStatus = useTourStore((s) => s.updateSegmentStatus);

  // Set up audio mode on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    return () => {
      unloadSound();
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    };
  }, []);

  const unloadSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {
        // Sound may already be unloaded
      }
      soundRef.current = null;
    }
  }, []);

  const loadAndPlaySegment = useCallback(
    async (segmentId: number) => {
      const segment = segments.find((s) => s.id === segmentId);
      if (!segment?.audioUrl) return;

      await unloadSound();

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: segment.audioUrl },
          { shouldPlay: true, progressUpdateIntervalMillis: 33 },
          (status) => {
            if (!status.isLoaded) return;
            const s = status as AVPlaybackStatusSuccess;

            updatePosition(s.positionMillis);

            if (s.didJustFinish) {
              // Segment finished — mark as completed, advance
              updateSegmentStatus(segmentId, "completed");

              const nextSeg = segments.find(
                (seg) => seg.id === segmentId + 1 && seg.status === "ready"
              );
              if (nextSeg) {
                // Wait gap then play next
                gapTimerRef.current = setTimeout(() => {
                  loadAndPlaySegment(nextSeg.id);
                }, SEGMENT_GAP_MS);
              } else {
                pause();
              }
            }
          }
        );
        soundRef.current = sound;
        setCurrentSegment(segmentId);
        updateSegmentStatus(segmentId, "playing");
        play();
      } catch (err) {
        console.error("Audio load error:", err);
      }
    },
    [segments, unloadSound, setCurrentSegment, updateSegmentStatus, updatePosition, play, pause]
  );

  const handlePlayPause = useCallback(async () => {
    if (!soundRef.current) {
      // Start from first ready segment
      const firstReady = segments.find((s) => s.status === "ready");
      if (firstReady) {
        await loadAndPlaySegment(firstReady.id);
        setActiveCard("player");
      }
      return;
    }

    if (isPlaying) {
      await soundRef.current.pauseAsync();
      pause();
    } else {
      await soundRef.current.playAsync();
      play();
    }
  }, [isPlaying, segments, loadAndPlaySegment, play, pause, setActiveCard]);

  const handleSkipNext = useCallback(async () => {
    if (currentSegmentId === null) return;

    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }

    const nextSeg = segments.find(
      (s) => s.id > currentSegmentId && (s.status === "ready" || s.status === "completed")
    );
    if (nextSeg) {
      if (currentSegmentId) {
        updateSegmentStatus(currentSegmentId, "completed");
      }
      await loadAndPlaySegment(nextSeg.id);
    }
  }, [currentSegmentId, segments, loadAndPlaySegment, updateSegmentStatus]);

  return {
    handlePlayPause,
    handleSkipNext,
    loadAndPlaySegment,
  };
}
