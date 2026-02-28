import { GOOGLE_MAPS_API_KEY, SF_DEFAULT_REGION } from "@/utils/constants";
import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

interface Props {
  onPlaceSelected: (location: {
    lat: number;
    lng: number;
    name: string;
  }) => void;
}

export default function SearchBar({ onPlaceSelected }: Props) {
  const ref = useRef<any>(null);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { top: insets.top + 8 }]}>
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder="Where do you want to go?"
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
        renderLeftButton={() => (
          <View style={styles.searchIcon}>
            <Ionicons name="search" size={20} color={Colors.textTertiary} />
          </View>
        )}
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
          placeholderTextColor: Colors.textTertiary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  searchIcon: {
    justifyContent: "center",
    alignItems: "center",
    height: 52,
    paddingLeft: 16,
  },
  input: {
    height: 52,
    backgroundColor: "transparent",
    color: Colors.textPrimary,
    fontSize: 16,
    borderRadius: 0,
    paddingLeft: 8,
    paddingRight: 20,
  },
  listView: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  row: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  description: {
    color: Colors.textPrimary,
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },
});
