import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { usePlaybackStore } from "@/stores/usePlaybackStore";
import { useTourStore } from "@/stores/useTourStore";
import KaraokeTranscript from "./KaraokeTranscript";

interface Props {
  onPlayPause: () => void;
  onSkipNext: () => void;
}

export default function AudioPlayerCard({ onPlayPause, onSkipNext }: Props) {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentSegmentId = usePlaybackStore((s) => s.currentSegmentId);
  const currentPositionMs = usePlaybackStore((s) => s.currentPositionMs);
  const segments = useTourStore((s) => s.segments);

  const currentSegment = segments.find((s) => s.id === currentSegmentId);
  const nextSegment = segments.find(
    (s) => currentSegmentId !== null && s.id === currentSegmentId + 1
  );

  if (!currentSegment) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No segment playing</Text>
      </View>
    );
  }

  const durationMs = (currentSegment.durationS || 0) * 1000;
  const progress = durationMs > 0 ? Math.min(currentPositionMs / durationMs, 1) : 0;

  return (
    <View style={styles.container}>
      {/* Current segment label */}
      <Text style={styles.segmentLabel}>{currentSegment.label}</Text>
      <Text style={styles.segmentType}>
        {currentSegment.type.replace("_", " ").toUpperCase()}
      </Text>

      {/* Karaoke transcript */}
      <View style={styles.transcriptContainer}>
        {currentSegment.transcript ? (
          <KaraokeTranscript
            transcript={currentSegment.transcript}
            durationMs={durationMs}
            currentPositionMs={currentPositionMs}
          />
        ) : (
          <Text style={styles.loadingText}>Loading transcript...</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(currentPositionMs)}</Text>
          <Text style={styles.timeText}>{formatTime(durationMs)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={onPlayPause}>
          <Text style={styles.controlIcon}>{isPlaying ? "⏸" : "▶️"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlBtn, !nextSegment && styles.controlBtnDisabled]}
          onPress={onSkipNext}
          disabled={!nextSegment}
        >
          <Text style={styles.controlIcon}>⏭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 4,
  },
  segmentLabel: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  segmentType: {
    color: "#00BFA6",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  transcriptContainer: {
    flex: 1,
    marginBottom: 12,
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00BFA6",
    borderRadius: 1.5,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timeText: {
    color: "#888",
    fontSize: 11,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingVertical: 8,
    paddingBottom: 16,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlBtnDisabled: {
    opacity: 0.3,
  },
  controlIcon: {
    fontSize: 24,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
});
