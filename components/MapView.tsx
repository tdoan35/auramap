import React, { useRef, useEffect } from "react";
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { StyleSheet } from "react-native";
import * as Location from "expo-location";
import { useRouteStore } from "@/stores/useRouteStore";
import { useAppStore } from "@/stores/useAppStore";
import { SF_DEFAULT_REGION } from "@/utils/constants";
import POIMarker from "./POIMarker";

export default function MapView() {
  const mapRef = useRef<RNMapView>(null);

  // Request location permission so the blue dot appears
  useEffect(() => {
    Location.requestForegroundPermissionsAsync();
  }, []);

  const polyline = useRouteStore((s) => s.polyline);
  const startLocation = useRouteStore((s) => s.startLocation);
  const endLocation = useRouteStore((s) => s.endLocation);
  const discoveredPOIs = useRouteStore((s) => s.discoveredPOIs);
  const selectedPOIIds = useRouteStore((s) => s.selectedPOIIds);
  const togglePOI = useRouteStore((s) => s.togglePOI);
  const phase = useAppStore((s) => s.phase);

  // Fit map to route when polyline changes
  useEffect(() => {
    if (polyline.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(polyline, {
        edgePadding: { top: 120, right: 60, bottom: 350, left: 60 },
        animated: true,
      });
    }
  }, [polyline]);

  return (
    <RNMapView
      ref={mapRef}
      style={styles.map}
      initialRegion={SF_DEFAULT_REGION}
      showsUserLocation
      showsMyLocationButton={false}
      customMapStyle={mapDarkStyle}
    >
      {/* Route polyline */}
      {polyline.length > 0 && (
        <Polyline
          coordinates={polyline}
          strokeColor="#00BFA6"
          strokeWidth={4}
        />
      )}

      {/* Start marker */}
      {startLocation && (
        <Marker
          coordinate={{ latitude: startLocation.lat, longitude: startLocation.lng }}
          title="Start"
          pinColor="#00BFA6"
        />
      )}

      {/* End marker */}
      {endLocation && (
        <Marker
          coordinate={{ latitude: endLocation.lat, longitude: endLocation.lng }}
          title={endLocation.name}
          pinColor="#FF6B6B"
        />
      )}

      {/* POI markers */}
      {phase !== "ROUTE_SETUP" &&
        discoveredPOIs.map((poi) => (
          <POIMarker
            key={poi.place_id}
            poi={poi}
            isSelected={selectedPOIIds.includes(poi.place_id)}
            onPress={() => togglePOI(poi.place_id)}
          />
        ))}
    </RNMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

// Dark-themed map style for better visibility
const mapDarkStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#383838" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#484848" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f2f2f" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
];
