import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTourStore } from "@/stores/useTourStore";
import { Colors } from "@/constants/theme";
import { Segment } from "@/types";

interface Props {
  onPlay: () => void;
  canPlay: boolean;
  onClose?: () => void;
}

export default function OutlineCard({ onPlay, canPlay, onClose }: Props) {
  const segments = useTourStore((s) => s.segments);
  const generationPhase = useTourStore((s) => s.generationPhase);
  const isGenerating = useTourStore((s) => s.isGenerating);
  const isComplete = useTourStore((s) => s.isComplete);
  const reasoning = useTourStore((s) => s.reasoning);

  // Find the first pending segment — that's the one currently generating
  const generatingIdx = isGenerating
    ? segments.findIndex((s) => s.status === "pending")
    : -1;

  return (
    <View style={styles.container}>
      {/* Header: title + play button + close */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Guide</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.playBtn, canPlay && styles.playBtnActive]}
            onPress={onPlay}
            disabled={!canPlay}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={14} color="#FFFFFF" />
            <Text
              style={[
                styles.playBtnText,
                !canPlay && styles.playBtnTextDisabled,
              ]}
            >
              Play
            </Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status label */}
      {isGenerating && (
        <Text style={styles.statusText}>
          {formatPhase(generationPhase || "starting")}
        </Text>
      )}
      {isComplete && (
        <Text style={styles.completeText}>Tour generation complete</Text>
      )}

      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Agent reasoning log */}
        {reasoning.length > 0 && (
          <View style={styles.reasoningContainer}>
            <Text style={styles.reasoningTitle}>Agent Reasoning</Text>
            <ScrollView
              style={styles.reasoningScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
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
          {segments.map((seg, idx) => (
            <SegmentRow
              key={seg.id}
              segment={seg}
              isCurrentlyGenerating={idx === generatingIdx}
            />
          ))}
          {isGenerating && segments.length === 0 && (
            <View style={styles.loadingPlaceholder}>
              <Ionicons
                name="compass-outline"
                size={32}
                color={Colors.textDisabled}
              />
              <Text style={styles.loadingText}>Planning your tour...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function agentIcon(agent: string): string {
  switch (agent) {
    case "researcher":
      return "[Research]";
    case "planner":
      return "[Planner]";
    case "evaluator":
      return "[Quality]";
    default:
      return "[Agent]";
  }
}

function SegmentRow({
  segment,
  isCurrentlyGenerating,
}: {
  segment: Segment;
  isCurrentlyGenerating: boolean;
}) {
  const isReady =
    segment.status === "ready" || segment.status === "completed";
  const isPlaying = segment.status === "playing";
  const isPending = segment.status === "pending" && !isCurrentlyGenerating;

  return (
    <View
      style={[
        styles.segmentRow,
        isCurrentlyGenerating && styles.segmentRowGenerating,
        isPending && styles.segmentRowPending,
      ]}
    >
      {/* Left icon */}
      <SegmentIcon
        isReady={isReady || isPlaying}
        isGenerating={isCurrentlyGenerating}
      />

      {/* Segment info */}
      <View style={styles.segmentInfo}>
        <Text
          style={[
            styles.segmentLabel,
            isCurrentlyGenerating && styles.segmentLabelGenerating,
            isPending && styles.segmentLabelPending,
          ]}
        >
          {segment.label}
        </Text>
        <Text
          style={[
            styles.segmentType,
            isPending && styles.segmentTypePending,
          ]}
        >
          {formatSegmentType(segment.type)}
          {segment.durationS
            ? ` · ~${segment.durationS} sec`
            : ""}
        </Text>
      </View>

      {/* Progress bar for generating segment */}
      {isCurrentlyGenerating && (
        <View style={styles.progressBarContainer}>
          <ProgressBar />
        </View>
      )}
    </View>
  );
}

function SegmentIcon({
  isReady,
  isGenerating,
}: {
  isReady: boolean;
  isGenerating: boolean;
}) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isGenerating) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isGenerating]);

  if (isReady) {
    return (
      <View style={[styles.segmentIcon, styles.segmentIconReady]}>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
      </View>
    );
  }

  if (isGenerating) {
    const spin = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });
    return (
      <View style={styles.segmentIcon}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="sync-outline" size={20} color={Colors.accent} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.segmentIcon}>
      <Ionicons name="ellipse-outline" size={20} color={Colors.textDisabled} />
    </View>
  );
}

function ProgressBar() {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const width = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["20%", "80%"],
  });

  return (
    <View style={styles.progressBg}>
      <Animated.View style={[styles.progressFill, { width }]} />
    </View>
  );
}

function formatSegmentType(type: string): string {
  const labels: Record<string, string> = {
    opening: "Opening",
    transit: "Transit",
    poi_arrival: "POI Deep Dive",
    outro: "Outro",
  };
  return labels[type] || type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPhase(phase: string): string {
  const labels: Record<string, string> = {
    starting: "Starting up...",
    enriching_pois: "Researching points of interest...",
    generating_outline: "Planning your tour...",
    generating_segments: "Generating your tour...",
  };
  return labels[phase] || phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.textDisabled,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  playBtnActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.19,
    shadowRadius: 12,
    elevation: 6,
  },
  playBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  playBtnTextDisabled: {
    color: "#FFFFFF",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },
  completeText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },
  scrollArea: {
    flex: 1,
  },
  reasoningContainer: {
    backgroundColor: Colors.accentLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    maxHeight: 140,
  },
  reasoningTitle: {
    color: Colors.accent,
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
    color: Colors.accent,
    fontSize: 11,
    fontWeight: "600",
    marginRight: 6,
    minWidth: 68,
  },
  reasoningMessage: {
    color: Colors.textSecondary,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  segmentList: {
    gap: 4,
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    backgroundColor: Colors.bgSurface,
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  segmentRowGenerating: {
    backgroundColor: Colors.accentLight,
  },
  segmentRowPending: {
    opacity: 0.6,
  },
  segmentIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentIconReady: {},
  segmentInfo: {
    flex: 1,
    gap: 2,
  },
  segmentLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  segmentLabelGenerating: {
    color: Colors.accent,
  },
  segmentLabelPending: {
    color: Colors.textTertiary,
  },
  segmentType: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  segmentTypePending: {
    color: Colors.textDisabled,
  },
  progressBarContainer: {
    width: "100%",
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D4D4D8",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  loadingPlaceholder: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
});
