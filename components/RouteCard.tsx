import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouteStore } from "@/stores/useRouteStore";
import { useAppStore } from "@/stores/useAppStore";
import { Colors } from "@/constants/theme";
import StopEditor from "./StopEditor";

interface Props {
  onStartTour: () => void;
  onClose: () => void;
}

export default function RouteCard({ onStartTour, onClose }: Props) {
  const startLocation = useRouteStore((s) => s.startLocation);
  const endLocation = useRouteStore((s) => s.endLocation);
  const totalDistanceM = useRouteStore((s) => s.totalDistanceM);
  const totalDurationS = useRouteStore((s) => s.totalDurationS);
  const discoveredPOIs = useRouteStore((s) => s.discoveredPOIs);
  const selectedPOIIds = useRouteStore((s) => s.selectedPOIIds);
  const selectMaxPOIs = useRouteStore((s) => s.selectMaxPOIs);
  const deselectAllPOIs = useRouteStore((s) => s.deselectAllPOIs);
  const routeMode = useAppStore((s) => s.routeMode);
  const setRouteMode = useAppStore((s) => s.setRouteMode);

  const handleSetRouteMode = (mode: "direct" | "scenic") => {
    setRouteMode(mode);
    if (mode === "scenic") {
      selectMaxPOIs();
    } else {
      deselectAllPOIs();
    }
  };

  const distanceMi = (totalDistanceM / 1609.34).toFixed(1);
  const durationMin = Math.ceil(totalDurationS / 60);
  const routeTitle = `${startLocation?.name ?? ""} \u2192 ${endLocation?.name ?? ""}`;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Title Row */}
      <View style={styles.titleRow}>
        <Text style={styles.routeTitle} numberOfLines={1}>
          {routeTitle}
        </Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Route Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="footsteps-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.statText}>{distanceMi} mi</Text>
        </View>
        <View style={styles.statDot} />
        <View style={styles.stat}>
          <Ionicons name="timer-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.statText}>{durationMin} min</Text>
        </View>
        <View style={styles.statDot} />
        <View style={styles.stat}>
          <Ionicons name="location-outline" size={16} color={Colors.accent} />
          <Text style={[styles.statText, styles.statTextAccent]}>
            {selectedPOIIds.length} POIs
          </Text>
        </View>
      </View>

      {/* Route Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, routeMode === "direct" && styles.modeBtnActive]}
          onPress={() => handleSetRouteMode("direct")}
        >
          <Ionicons
            name="arrow-forward"
            size={16}
            color={routeMode === "direct" ? Colors.textPrimary : Colors.textTertiary}
          />
          <Text
            style={[
              styles.modeBtnText,
              routeMode === "direct" ? styles.modeBtnTextActive : styles.modeBtnTextInactive,
            ]}
          >
            Direct
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, routeMode === "scenic" && styles.modeBtnActive]}
          onPress={() => handleSetRouteMode("scenic")}
        >
          <Ionicons
            name="leaf-outline"
            size={16}
            color={routeMode === "scenic" ? Colors.textPrimary : Colors.textTertiary}
          />
          <Text
            style={[
              styles.modeBtnText,
              routeMode === "scenic" ? styles.modeBtnTextActive : styles.modeBtnTextInactive,
            ]}
          >
            Scenic
          </Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Stops Section */}
      <StopEditor />

      {/* Start Tour Button */}
      <TouchableOpacity
        style={[
          styles.startBtn,
          routeMode === "scenic" && selectedPOIIds.length === 0 && styles.startBtnDisabled,
        ]}
        onPress={onStartTour}
        disabled={routeMode === "scenic" && selectedPOIIds.length === 0}
        activeOpacity={0.8}
      >
        <Ionicons name="headset-outline" size={20} color="#FFFFFF" />
        <Text style={styles.startBtnText}>Start Tour</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Title Row
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  routeTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginRight: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgSurface,
    justifyContent: "center",
    alignItems: "center",
  },
  // Route Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  statTextAccent: {
    color: Colors.accent,
  },
  statDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textDisabled,
  },
  // Route Mode Toggle
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.bgSurface,
    borderRadius: 22,
    padding: 4,
    height: 44,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 14,
  },
  modeBtnTextActive: {
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  modeBtnTextInactive: {
    fontWeight: "500",
    color: Colors.textTertiary,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  // Start Tour Button
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accent,
    height: 52,
    borderRadius: 26,
    gap: 8,
    marginTop: 8,
    marginBottom: 32,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.19,
    shadowRadius: 12,
    elevation: 6,
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
