import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useTourStore } from "@/stores/useTourStore";
import { Segment } from "@/types";

interface Props {
  onPlay: () => void;
  canPlay: boolean;
}

export default function OutlineCard({ onPlay, canPlay }: Props) {
  const segments = useTourStore((s) => s.segments);
  const generationPhase = useTourStore((s) => s.generationPhase);
  const isGenerating = useTourStore((s) => s.isGenerating);
  const isComplete = useTourStore((s) => s.isComplete);
  const reasoning = useTourStore((s) => s.reasoning);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tour Outline</Text>

      {/* Generation status */}
      {isGenerating && generationPhase && (
        <View style={styles.statusBar}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{formatPhase(generationPhase)}</Text>
        </View>
      )}

      {/* Agent reasoning log */}
      {reasoning.length > 0 && (
        <View style={styles.reasoningContainer}>
          <Text style={styles.reasoningTitle}>Agent Reasoning</Text>
          <ScrollView style={styles.reasoningScroll} nestedScrollEnabled>
            {reasoning.map((r, i) => (
              <View key={i} style={styles.reasoningRow}>
                <Text style={styles.reasoningAgent}>{agentIcon(r.agent)}</Text>
                <Text style={styles.reasoningMessage}>{r.message}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Segment list */}
      <View style={styles.segmentList}>
        {segments.map((seg) => (
          <SegmentRow key={seg.id} segment={seg} />
        ))}
        {isGenerating && segments.length === 0 && reasoning.length === 0 && (
          <View style={styles.loadingPlaceholder}>
            <Text style={styles.loadingText}>Preparing your tour...</Text>
          </View>
        )}
      </View>

      {/* Play button */}
      <TouchableOpacity
        style={[styles.playBtn, !canPlay && styles.playBtnDisabled]}
        onPress={onPlay}
        disabled={!canPlay}
      >
        <Text style={styles.playBtnText}>
          {canPlay ? "▶  Play Tour" : "Generating..."}
        </Text>
      </TouchableOpacity>

      {isComplete && (
        <Text style={styles.completeText}>Tour generation complete</Text>
      )}
    </View>
  );
}

function agentIcon(agent: string): string {
  switch (agent) {
    case "researcher": return "[Research]";
    case "planner": return "[Planner]";
    case "evaluator": return "[Quality]";
    default: return "[Agent]";
  }
}

function SegmentRow({ segment }: { segment: Segment }) {
  return (
    <View style={styles.segmentRow}>
      <View
        style={[styles.segmentIndicator, segmentIndicatorStyle(segment.status)]}
      />
      <View style={styles.segmentInfo}>
        <Text style={styles.segmentLabel}>{segment.label}</Text>
        <Text style={styles.segmentType}>{formatSegmentType(segment.type)}</Text>
      </View>
      <SegmentStatusBadge status={segment.status} />
    </View>
  );
}

function SegmentStatusBadge({ status }: { status: Segment["status"] }) {
  const colors: Record<string, string> = {
    pending: "#555",
    generating: "#FFB74D",
    ready: "#00BFA6",
    playing: "#4FC3F7",
    completed: "#81C784",
  };
  return (
    <View style={[styles.badge, { backgroundColor: `${colors[status]}22` }]}>
      <Text style={[styles.badgeText, { color: colors[status] }]}>
        {status === "generating" ? "..." : status === "playing" ? "▶" : status === "completed" ? "✓" : status === "ready" ? "●" : "○"}
      </Text>
    </View>
  );
}

function segmentIndicatorStyle(status: string) {
  switch (status) {
    case "playing":
      return { backgroundColor: "#4FC3F7" };
    case "completed":
      return { backgroundColor: "#81C784" };
    case "ready":
      return { backgroundColor: "#00BFA6" };
    case "generating":
      return { backgroundColor: "#FFB74D" };
    default:
      return { backgroundColor: "#444" };
  }
}

function formatSegmentType(type: string): string {
  return type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPhase(phase: string): string {
  return phase
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,183,77,0.1)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFB74D",
    marginRight: 8,
  },
  statusText: {
    color: "#FFB74D",
    fontSize: 13,
    fontWeight: "500",
  },
  reasoningContainer: {
    backgroundColor: "rgba(79,195,247,0.08)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    maxHeight: 140,
  },
  reasoningTitle: {
    color: "#4FC3F7",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reasoningScroll: {
    maxHeight: 100,
  },
  reasoningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  reasoningAgent: {
    color: "#4FC3F7",
    fontSize: 11,
    fontWeight: "600",
    marginRight: 6,
    minWidth: 68,
  },
  reasoningMessage: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  segmentList: {
    flex: 1,
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  segmentIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  segmentInfo: {
    flex: 1,
  },
  segmentLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  segmentType: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  playBtn: {
    backgroundColor: "#00BFA6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  playBtnDisabled: {
    backgroundColor: "rgba(0,191,166,0.3)",
  },
  playBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  completeText: {
    color: "#81C784",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  loadingPlaceholder: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
  },
});
