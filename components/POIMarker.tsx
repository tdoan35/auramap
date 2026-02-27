import React from "react";
import { Marker } from "react-native-maps";
import { View, Text, StyleSheet } from "react-native";
import { POI } from "@/types";

interface Props {
  poi: POI;
  isSelected: boolean;
  onPress: () => void;
}

export default function POIMarker({ poi, isSelected, onPress }: Props) {
  return (
    <Marker
      coordinate={{ latitude: poi.lat, longitude: poi.lng }}
      title={poi.name}
      onPress={onPress}
    >
      <View style={[styles.marker, isSelected && styles.selected]}>
        <Text style={[styles.icon, isSelected && styles.selectedIcon]}>
          {isSelected ? "★" : "☆"}
        </Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#888",
  },
  selected: {
    backgroundColor: "#FFB74D",
    borderColor: "#FF9800",
  },
  icon: {
    fontSize: 16,
    color: "#888",
  },
  selectedIcon: {
    color: "#fff",
  },
});
