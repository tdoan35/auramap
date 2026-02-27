import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouteStore } from "@/stores/useRouteStore";
import { useAppStore } from "@/stores/useAppStore";
import StopEditor from "./StopEditor";

interface Props {
  onStartTour: () => void;
}

export default function RouteCard({ onStartTour }: Props) {
  const totalDistanceM = useRouteStore((s) => s.totalDistanceM);
  const totalDurationS = useRouteStore((s) => s.totalDurationS);
  const discoveredPOIs = useRouteStore((s) => s.discoveredPOIs);
  const selectedPOIIds = useRouteStore((s) => s.selectedPOIIds);
  const routeMode = useAppStore((s) => s.routeMode);
  const setRouteMode = useAppStore((s) => s.setRouteMode);

  const distanceKm = (totalDistanceM / 1000).toFixed(1);
  const durationMin = Math.ceil(totalDurationS / 60);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Route summary */}
      <View style={styles.summary}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{distanceKm} km</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{durationMin} min</Text>
          <Text style={styles.statLabel}>Walk Time</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{discoveredPOIs.length}</Text>
          <Text style={styles.statLabel}>POIs Found</Text>
        </View>
      </View>

      {/* Route mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, routeMode === "direct" && styles.modeBtnActive]}
          onPress={() => setRouteMode("direct")}
        >
          <Text
            style={[styles.modeBtnText, routeMode === "direct" && styles.modeBtnTextActive]}
          >
            Direct
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, routeMode === "scenic" && styles.modeBtnActive]}
          onPress={() => setRouteMode("scenic")}
        >
          <Text
            style={[styles.modeBtnText, routeMode === "scenic" && styles.modeBtnTextActive]}
          >
            Scenic
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stop editor (scenic mode) */}
      {routeMode === "scenic" && <StopEditor />}

      {/* Start Tour button */}
      <TouchableOpacity
        style={[
          styles.startBtn,
          routeMode === "scenic" && selectedPOIIds.length === 0 && styles.startBtnDisabled,
        ]}
        onPress={onStartTour}
        disabled={routeMode === "scenic" && selectedPOIIds.length === 0}
      >
        <Text style={styles.startBtnText}>Start Tour</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: "#00BFA6",
  },
  modeBtnText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "600",
  },
  modeBtnTextActive: {
    color: "#fff",
  },
  startBtn: {
    backgroundColor: "#00BFA6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 30,
  },
  startBtnDisabled: {
    backgroundColor: "rgba(0,191,166,0.3)",
  },
  startBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
