import React from "react";
import { Marker } from "react-native-maps";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { POI } from "@/types";
import { Colors } from "@/constants/theme";

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
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
    >
      <View style={[styles.marker, isSelected ? styles.selected : styles.unselected]}>
        <Ionicons
          name="business-outline"
          size={isSelected ? 16 : 14}
          color="#FFFFFF"
        />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  selected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
  },
  unselected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentMuted,
    opacity: 0.8,
  },
});
