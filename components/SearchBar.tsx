import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAPS_API_KEY, SF_DEFAULT_REGION } from "@/utils/constants";
import { useRouteStore } from "@/stores/useRouteStore";

interface Props {
  onPlaceSelected: (location: { lat: number; lng: number; name: string }) => void;
}

export default function SearchBar({ onPlaceSelected }: Props) {
  const ref = useRef<any>(null);

  return (
    <View style={styles.container}>
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder="Where do you want to explore?"
        fetchDetails
        onPress={(data, details) => {
          if (!details?.geometry?.location) return;
          onPlaceSelected({
            lat: details.geometry.location.lat,
            lng: details.geometry.location.lng,
            name: data.description || details.name || "Destination",
          });
        }}
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: "en",
          location: `${SF_DEFAULT_REGION.latitude},${SF_DEFAULT_REGION.longitude}`,
          radius: 20000,
        }}
        styles={{
          container: { flex: 0 },
          textInputContainer: styles.inputContainer,
          textInput: styles.input,
          listView: styles.listView,
          row: styles.row,
          description: styles.description,
          separator: styles.separator,
        }}
        enablePoweredByContainer={false}
        textInputProps={{
          placeholderTextColor: "#999",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  inputContainer: {
    backgroundColor: "transparent",
  },
  input: {
    height: 50,
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    color: "#fff",
    fontSize: 16,
    borderRadius: 25,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  listView: {
    backgroundColor: "rgba(30, 30, 30, 0.98)",
    borderRadius: 16,
    marginTop: 8,
    overflow: "hidden",
  },
  row: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  description: {
    color: "#ddd",
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
