import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouteStore } from "@/stores/useRouteStore";
import { Colors } from "@/constants/theme";
import { POI_SELECTION_LIMIT } from "@/utils/constants";

function formatPOIType(types: string[]): string {
  if (!types || types.length === 0) return "Point of interest";
  const typeMap: Record<string, string> = {
    tourist_attraction: "Tourist attraction",
    museum: "Museum",
    park: "Park",
    church: "Place of worship",
    restaurant: "Restaurant",
    point_of_interest: "Point of interest",
    establishment: "Establishment",
    art_gallery: "Art gallery",
    landmark: "Historic landmark",
    natural_feature: "Natural feature",
    cafe: "Cafe",
    bar: "Bar",
    store: "Store",
    library: "Library",
  };
  for (const t of types) {
    if (typeMap[t]) return typeMap[t];
  }
  const first = types.find(
    (t) => !["point_of_interest", "establishment", "geocode"].includes(t)
  );
  if (first) {
    return first
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return "Point of interest";
}

export default function StopEditor() {
  const discoveredPOIs = useRouteStore((s) => s.discoveredPOIs);
  const selectedPOIIds = useRouteStore((s) => s.selectedPOIIds);
  const togglePOI = useRouteStore((s) => s.togglePOI);

  const atLimit = selectedPOIIds.length >= POI_SELECTION_LIMIT;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stops</Text>
        <Text style={styles.counter}>
          {selectedPOIIds.length}/{POI_SELECTION_LIMIT}
        </Text>
      </View>

      {/* All discovered POIs */}
      {discoveredPOIs.map((poi) => {
        const selectedIndex = selectedPOIIds.indexOf(poi.place_id);
        const isSelected = selectedIndex !== -1;

        return (
          <TouchableOpacity
            key={poi.place_id}
            style={[styles.row, isSelected && styles.rowSelected]}
            onPress={() => {
              if (isSelected || !atLimit) togglePOI(poi.place_id);
            }}
            disabled={!isSelected && atLimit}
            activeOpacity={0.7}
          >
            {/* Left: number badge or add icon */}
            {isSelected ? (
              <View style={styles.stopNum}>
                <Text style={styles.stopNumText}>{selectedIndex + 1}</Text>
              </View>
            ) : (
              <View style={[styles.addCircle, atLimit && styles.addCircleDisabled]}>
                <Ionicons
                  name="add"
                  size={16}
                  color={atLimit ? Colors.textDisabled : Colors.accent}
                />
              </View>
            )}

            {/* Middle: name + type */}
            <View style={styles.info}>
              <Text
                style={[styles.name, !isSelected && atLimit && styles.nameDisabled]}
                numberOfLines={1}
              >
                {poi.name}
              </Text>
              <Text style={styles.desc} numberOfLines={1}>
                {formatPOIType(poi.types)}
                {poi.rating != null ? ` \u00B7 \u2605 ${poi.rating.toFixed(1)}` : ""}
              </Text>
            </View>

            {/* Right: remove button for selected */}
            {isSelected && (
              <Ionicons name="close-circle" size={20} color={Colors.textDisabled} />
            )}
          </TouchableOpacity>
        );
      })}

      {discoveredPOIs.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No nearby points of interest found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  counter: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textTertiary,
  },
  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgSurface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowSelected: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  // Number badge (selected)
  stopNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  stopNumText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  // Add circle (unselected)
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  addCircleDisabled: {
    borderColor: Colors.textDisabled,
  },
  // Info
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  nameDisabled: {
    color: Colors.textTertiary,
  },
  desc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // Empty
  emptyState: {
    backgroundColor: Colors.bgSurface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
});
