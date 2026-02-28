import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlaybackStore } from "@/stores/usePlaybackStore";
import { useTourStore } from "@/stores/useTourStore";
import { Colors } from "@/constants/theme";
import KaraokeTranscript from "./KaraokeTranscript";

interface Props {
  onPlayPause: () => void;
  onSkipNext: () => void;
  onClose?: () => void;
}

export default function AudioPlayerCard({ onPlayPause, onSkipNext, onClose }: Props) {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentSegmentId = usePlaybackStore((s) => s.currentSegmentId);
  const currentPositionMs = usePlaybackStore((s) => s.currentPositionMs);
  const segments = useTourStore((s) => s.segments);

  const currentSegment = segments.find((s) => s.id === currentSegmentId);
  const currentIndex = segments.findIndex((s) => s.id === currentSegmentId);
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
      {/* Close button */}
      {onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Now Playing badge */}
      <View style={styles.segBadge}>
        <Ionicons name="headset-outline" size={12} color={Colors.accent} />
        <Text style={styles.segBadgeText}>NOW PLAYING</Text>
      </View>

      {/* Current segment label */}
      <Text style={styles.segmentLabel}>{currentSegment.label}</Text>
      <Text style={styles.segmentMeta}>
        Segment {currentIndex + 1} of {segments.length} \u00B7 {currentSegment.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
        <TouchableOpacity style={styles.skipBtn}>
          <Ionicons name="play-skip-back" size={28} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playPauseBtn} onPress={onPlayPause}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={28}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.skipBtn, !nextSegment && styles.skipBtnDisabled]}
          onPress={onSkipNext}
          disabled={!nextSegment}
        >
          <Ionicons name="play-skip-forward" size={28} color={Colors.textPrimary} />
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
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 4,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.07)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  segBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentLight,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 4,
  },
  segBadgeText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  segmentLabel: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  segmentMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 12,
  },
  transcriptContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: Colors.bgSurface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  loadingText: {
    color: Colors.textTertiary,
    fontSize: 14,
    marginTop: 20,
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.borderSubtle,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  timeText: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
    paddingVertical: 8,
    paddingBottom: 16,
  },
  skipBtn: {
    justifyContent: "center",
    alignItems: "center",
  },
  skipBtnDisabled: {
    opacity: 0.3,
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.19,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
});
