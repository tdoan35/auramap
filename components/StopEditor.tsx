import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouteStore } from "@/stores/useRouteStore";
import { POI_SELECTION_LIMIT } from "@/utils/constants";

export default function StopEditor() {
  const discoveredPOIs = useRouteStore((s) => s.discoveredPOIs);
  const selectedPOIIds = useRouteStore((s) => s.selectedPOIIds);
  const stops = useRouteStore((s) => s.stops);
  const togglePOI = useRouteStore((s) => s.togglePOI);
  const removeStop = useRouteStore((s) => s.removeStop);

  const unselectedPOIs = discoveredPOIs.filter(
    (p) => !selectedPOIIds.includes(p.place_id)
  );

  return (
    <View style={styles.container}>
      {/* Selected stops */}
      {stops.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Your Stops ({stops.length}/{POI_SELECTION_LIMIT})
          </Text>
          {stops.map((poi, index) => (
            <View key={poi.place_id} style={styles.stopRow}>
              <View style={styles.stopIndex}>
                <Text style={styles.stopIndexText}>{index + 1}</Text>
              </View>
              <Text style={styles.stopName} numberOfLines={1}>
                {poi.name}
              </Text>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeStop(poi.place_id)}
              >
                <Text style={styles.removeBtnText}>-</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Available POIs */}
      {unselectedPOIs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Attractions</Text>
          {unselectedPOIs.map((poi) => (
            <View key={poi.place_id} style={styles.poiRow}>
              <View style={styles.poiInfo}>
                <Text style={styles.poiName} numberOfLines={1}>
                  {poi.name}
                </Text>
                {poi.rating && (
                  <Text style={styles.poiRating}>★ {poi.rating.toFixed(1)}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.addBtn,
                  selectedPOIIds.length >= POI_SELECTION_LIMIT && styles.addBtnDisabled,
                ]}
                onPress={() => togglePOI(poi.place_id)}
                disabled={selectedPOIIds.length >= POI_SELECTION_LIMIT}
              >
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  stopIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#00BFA6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stopIndexText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  stopName: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,100,100,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  removeBtnText: {
    color: "#FF6B6B",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  poiRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  poiInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  poiName: {
    color: "#ccc",
    fontSize: 14,
    flex: 1,
  },
  poiRating: {
    color: "#FFB74D",
    fontSize: 12,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,191,166,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  addBtnDisabled: {
    opacity: 0.3,
  },
  addBtnText: {
    color: "#00BFA6",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
});
