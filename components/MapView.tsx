import React, { useRef, useEffect, useCallback, useState } from "react";
import { Animated, Dimensions, Easing, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import RNMapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouteStore } from "@/stores/useRouteStore";
import { useAppStore } from "@/stores/useAppStore";
import { SF_DEFAULT_REGION } from "@/utils/constants";
import { Colors } from "@/constants/theme";
import POIMarker from "./POIMarker";

const PULSE_DURATION = 2000;

function PulsingDot({ coordinate }: { coordinate: { latitude: number; longitude: number } }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [tracksChanges, setTracksChanges] = useState(true);
  const prevCoord = useRef(coordinate);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: PULSE_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      })
    );
    loop.start();
    // Stop tracking after one cycle to prevent the marker from disappearing
    // during map animations (known react-native-maps iOS issue)
    const timer = setTimeout(() => setTracksChanges(false), PULSE_DURATION);
    return () => {
      loop.stop();
      clearTimeout(timer);
    };
  }, [pulse]);

  // Briefly re-enable tracking when the user moves so the marker repositions
  useEffect(() => {
    if (
      prevCoord.current.latitude !== coordinate.latitude ||
      prevCoord.current.longitude !== coordinate.longitude
    ) {
      prevCoord.current = coordinate;
      setTracksChanges(true);
      const timer = setTimeout(() => setTracksChanges(false), 300);
      return () => clearTimeout(timer);
    }
  }, [coordinate.latitude, coordinate.longitude]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] });

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracksChanges} zIndex={999}>
      <View style={pulseStyles.container}>
        <Animated.View style={[pulseStyles.ring, { transform: [{ scale }], opacity }]} />
        <View style={pulseStyles.dot} />
      </View>
    </Marker>
  );
}

const pulseStyles: Record<string, ViewStyle> = {
  container: { width: 60, height: 60, justifyContent: "center", alignItems: "center" },
  ring: { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.locationBlue + "30" },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.locationBlue, borderWidth: 3, borderColor: "#fff",
    shadowColor: Colors.locationBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
};

const markerStyles: Record<string, ViewStyle> = {
  pin: { alignItems: "center", justifyContent: "center" },
};

export default function MapView() {
  const mapRef = useRef<RNMapView>(null);
  const [userLocation, setUserLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        500
      );
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
      );
    })();
    return () => { sub?.remove(); };
  }, []);

  const polyline = useRouteStore((s) => s.polyline);
  const startLocation = useRouteStore((s) => s.startLocation);
  const endLocation = useRouteStore((s) => s.endLocation);
  const discoveredPOIs = useRouteStore((s) => s.discoveredPOIs);
  const selectedPOIIds = useRouteStore((s) => s.selectedPOIIds);
  const togglePOI = useRouteStore((s) => s.togglePOI);
  const phase = useAppStore((s) => s.phase);

  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.58);

  // Fit map to route — re-triggers on polyline change AND phase change
  const fitMapToRoute = useCallback(() => {
    if (polyline.length === 0 || !mapRef.current) return;

    const hasCard = phase !== "ROUTE_SETUP";
    const bottomPadding = hasCard ? CARD_HEIGHT + 20 : 120;

    mapRef.current.fitToCoordinates(polyline, {
      edgePadding: { top: 100, right: 60, bottom: bottomPadding, left: 60 },
      animated: true,
    });
  }, [polyline, phase, CARD_HEIGHT]);

  useEffect(() => {
    fitMapToRoute();
  }, [fitMapToRoute]);

  const centerOnUser = async () => {
    const location = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };

  return (
    <>
    <RNMapView
      ref={mapRef}
      style={styles.map}
      initialRegion={SF_DEFAULT_REGION}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {/* Route polyline */}
      {polyline.length > 0 && (
        <Polyline
          coordinates={polyline}
          strokeColor={Colors.accent}
          strokeWidth={4}
        />
      )}

      {/* Start marker */}
      {startLocation && (
        <Marker
          coordinate={{ latitude: startLocation.lat, longitude: startLocation.lng }}
          title="Start"
          tracksViewChanges={false}
          zIndex={100}
        >
          <View style={markerStyles.pin}>
            <Ionicons name="location" size={32} color={Colors.startGreen} />
          </View>
        </Marker>
      )}

      {/* End marker */}
      {endLocation && (
        <Marker
          coordinate={{ latitude: endLocation.lat, longitude: endLocation.lng }}
          title={endLocation.name}
          tracksViewChanges={false}
          zIndex={100}
        >
          <View style={markerStyles.pin}>
            <Ionicons name="location" size={32} color={Colors.endRed} />
          </View>
        </Marker>
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
      {/* Pulsing user location dot */}
      {userLocation && <PulsingDot coordinate={userLocation} />}
    </RNMapView>
    <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
      <Ionicons name="locate-outline" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  locationButton: {
    position: "absolute",
    bottom: 100,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
});
