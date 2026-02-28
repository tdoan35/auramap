import React, { useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import WelcomeScreen from "@/components/WelcomeScreen";
import MapViewComponent from "@/components/MapView";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import BottomCard from "@/components/BottomCard";
import RouteCard from "@/components/RouteCard";
import OutlineCard from "@/components/OutlineCard";
import AudioPlayerCard from "@/components/AudioPlayerCard";
import SwipeableCardContainer from "@/components/SwipeableCardContainer";
import { Colors } from "@/constants/theme";

import { useAppStore } from "@/stores/useAppStore";
import { useRouteStore } from "@/stores/useRouteStore";
import { useTourStore } from "@/stores/useTourStore";
import { usePlaybackStore } from "@/stores/usePlaybackStore";

import { getWalkingRoute } from "@/services/directionsService";
import { discoverPOIs } from "@/services/placesService";
import { connectToTourStream } from "@/services/sseService";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { usePushToTalk } from "@/hooks/usePushToTalk";

import { Location, TourGenerateRequest, Segment, PTTStatus } from "@/types";

// Default start location (Moscone Center, SF)
const DEFAULT_START: Location = {
  lat: 37.7844,
  lng: -122.4006,
  name: "Moscone Center",
};

// PTT FAB helpers
function pttFabStyle(status: PTTStatus) {
  switch (status) {
    case "listening": return { backgroundColor: "#EF4444" };       // red
    case "connecting":
    case "processing": return { backgroundColor: "#F59E0B" };      // amber
    case "responding": return { backgroundColor: "#22C55E" };      // green
    default: return undefined;
  }
}

function pttIconName(status: PTTStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "listening": return "mic";
    case "connecting":
    case "processing": return "hourglass-outline";
    case "responding": return "volume-high";
    default: return "mic";
  }
}

export default function MainScreen() {
  const phase = useAppStore((s) => s.phase);
  const setPhase = useAppStore((s) => s.setPhase);
  const routeMode = useAppStore((s) => s.routeMode);

  const resetToSetup = useAppStore((s) => s.resetToSetup);

  const setStart = useRouteStore((s) => s.setStart);
  const setEnd = useRouteStore((s) => s.setEnd);
  const setRoute = useRouteStore((s) => s.setRoute);
  const setDiscoveredPOIs = useRouteStore((s) => s.setDiscoveredPOIs);
  const selectMaxPOIs = useRouteStore((s) => s.selectMaxPOIs);
  const updateLegs = useRouteStore((s) => s.updateLegs);
  const clearRoute = useRouteStore((s) => s.clearRoute);

  const startGeneration = useTourStore((s) => s.startGeneration);
  const addSegment = useTourStore((s) => s.addSegment);
  const setTourPhase = useTourStore((s) => s.setPhase);
  const setComplete = useTourStore((s) => s.setComplete);
  const setError = useTourStore((s) => s.setError);
  const setOutline = useTourStore((s) => s.setOutline);
  const addReasoning = useTourStore((s) => s.addReasoning);
  const segments = useTourStore((s) => s.segments);

  const setActiveCard = usePlaybackStore((s) => s.setActiveCard);

  const sseRef = useRef<{ close: () => void } | null>(null);

  // Shared animated value for card height — drives FAB positioning
  const cardHeightAnim = useRef(new Animated.Value(0)).current;
  const FAB_GAP = 12;
  const FAB_BASE_BOTTOM = 24;
  const fabBottomAnim = useRef(Animated.add(cardHeightAnim, FAB_GAP)).current;

  // Animate card height to 0 when returning to setup (no card)
  useEffect(() => {
    if (phase === "ROUTE_SETUP") {
      Animated.spring(cardHeightAnim, {
        toValue: FAB_BASE_BOTTOM,
        useNativeDriver: false,
        tension: 80,
        friction: 12,
      }).start();
    }
  }, [phase, cardHeightAnim]);

  const resetTour = useTourStore((s) => s.reset);
  const resetPlayback = usePlaybackStore((s) => s.reset);

  const { handlePlayPause, handleSkipNext, loadAndPlaySegment, stopPlayback, pauseTourAudio, resumeTourAudio } = useAudioPlayer();
  const { onPressIn, onPressOut, pttStatus } = usePushToTalk({ pauseTourAudio, resumeTourAudio });

  // Handle destination selection from search bar
  const handlePlaceSelected = useCallback(
    async (dest: Location) => {
      setStart(DEFAULT_START);
      setEnd(dest);

      try {
        // Get walking route
        const result = await getWalkingRoute(
          { latitude: DEFAULT_START.lat, longitude: DEFAULT_START.lng },
          { latitude: dest.lat, longitude: dest.lng }
        );
        setRoute(
          result.encodedPolyline,
          result.decodedPath,
          result.totalDistanceM,
          result.totalDurationS
        );
        updateLegs(result.legs);

        // Discover POIs along route
        const pois = await discoverPOIs(result.decodedPath);
        setDiscoveredPOIs(pois);

        // Auto-select POIs if default mode is scenic
        if (useAppStore.getState().routeMode === "scenic") {
          selectMaxPOIs();
        }

        // Transition to route customization
        setPhase("ROUTE_CUSTOMIZATION");
      } catch (err) {
        console.error("Route/POI error:", err);
      }
    },
    [setStart, setEnd, setRoute, setDiscoveredPOIs, updateLegs, setPhase]
  );

  // Close route customization and go back to setup
  const handleCloseRoute = useCallback(() => {
    clearRoute();
    resetToSetup();
  }, [clearRoute, resetToSetup]);

  // End tour and go back to route customization
  const handleEndTour = useCallback(async () => {
    // Stop audio playback and clear timers
    await stopPlayback();
    // Close SSE connection
    sseRef.current?.close();
    sseRef.current = null;
    // Reset tour and playback state
    resetTour();
    resetPlayback();
    // Go back to route customization
    setPhase("ROUTE_CUSTOMIZATION");
  }, [stopPlayback, resetTour, resetPlayback, setPhase]);

  // Track stops length for route recalculation
  const stopsLength = useRouteStore((s) => s.stops.length);

  // Recalculate route when route mode or stops change
  useEffect(() => {
    if (phase !== "ROUTE_CUSTOMIZATION") return;

    const { startLocation, endLocation, stops } = useRouteStore.getState();
    if (!startLocation || !endLocation) return;

    const waypoints =
      routeMode === "scenic"
        ? stops.map((p) => ({ latitude: p.lat, longitude: p.lng }))
        : [];

    getWalkingRoute(
      { latitude: startLocation.lat, longitude: startLocation.lng },
      { latitude: endLocation.lat, longitude: endLocation.lng },
      waypoints.length > 0 ? waypoints : undefined
    )
      .then((result) => {
        setRoute(
          result.encodedPolyline,
          result.decodedPath,
          result.totalDistanceM,
          result.totalDurationS
        );
        updateLegs(result.legs);
      })
      .catch((err) => console.error("Route recalc error:", err));
  }, [routeMode, stopsLength]);

  // Start tour generation
  const handleStartTour = useCallback(() => {
    const state = useRouteStore.getState();
    const { startLocation, endLocation, encodedPolyline, totalDistanceM, totalDurationS, stops, legs } = state;
    if (!startLocation || !endLocation || !encodedPolyline) return;

    const tourId = `tour_${Date.now()}`;
    startGeneration(tourId);
    setPhase("TOUR_LOADING");

    const request: TourGenerateRequest = {
      route: {
        start: startLocation,
        end: endLocation,
        polyline: encodedPolyline,
        total_distance_m: totalDistanceM,
        total_duration_s: totalDurationS,
      },
      selected_pois: routeMode === "scenic" ? stops : [],
      legs,
      voice_id: "English_CalmWoman",
    };

    sseRef.current = connectToTourStream(request, {
      onStatus: (data) => {
        setTourPhase(data.phase);
      },
      onOutline: (data) => {
        setOutline(data);
      },
      onSegment: (data) => {
        const segment: Segment = {
          id: data.segment_id,
          type: data.type as Segment["type"],
          label: data.label,
          status: "ready",
          audioUrl: data.audio_url,
          transcript: data.transcript,
          durationS: data.duration_s,
        };
        addSegment(segment);
      },
      onReasoning: (data) => {
        addReasoning(data);
      },
      onComplete: () => {
        setComplete();
      },
      onError: (error) => {
        console.error("SSE error:", error);
        setError(error);
      },
    });
  }, [routeMode, startGeneration, setPhase, setTourPhase, setOutline, addSegment, addReasoning, setComplete, setError]);

  // Handle play button from outline card
  const handlePlay = useCallback(() => {
    setPhase("TOUR_PLAYBACK");
    setActiveCard("player");
    handlePlayPause();
  }, [setPhase, setActiveCard, handlePlayPause]);

  const canPlay = segments.some((s) => s.status === "ready");

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      sseRef.current?.close();
    };
  }, []);

  // Welcome screen is a full takeover — no map behind it
  if (phase === "WELCOME") {
    return <WelcomeScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      <MapViewComponent />

      {/* Search bar + filter chips — visible only in ROUTE_SETUP */}
      {phase === "ROUTE_SETUP" && (
        <>
          <SearchBar onPlaceSelected={handlePlaceSelected} />
          <FilterChips />
        </>
      )}

      {/* Bottom card — visible after route is set */}
      {phase === "ROUTE_CUSTOMIZATION" && (
        <BottomCard heightAnim={cardHeightAnim}>
          <RouteCard onStartTour={handleStartTour} onClose={handleCloseRoute} />
        </BottomCard>
      )}

      {phase === "TOUR_LOADING" && (
        <BottomCard expandable={false} heightAnim={cardHeightAnim}>
          <OutlineCard onPlay={handlePlay} canPlay={canPlay} onClose={handleEndTour} />
        </BottomCard>
      )}

      {phase === "TOUR_PLAYBACK" && (
        <BottomCard expandable={false} heightAnim={cardHeightAnim}>
          <SwipeableCardContainer>
            <OutlineCard onPlay={handlePlayPause} canPlay={canPlay} onClose={handleEndTour} />
            <AudioPlayerCard
              onPlayPause={handlePlayPause}
              onSkipNext={handleSkipNext}
              onClose={handleEndTour}
            />
          </SwipeableCardContainer>
        </BottomCard>
      )}

      {/* Ask AI FAB — visible on all phases except WELCOME */}
      {phase !== "WELCOME" && (
        <Animated.View style={[styles.askAiFab, { bottom: fabBottomAnim }]}>
          <TouchableOpacity
            style={[styles.askAiFabInner, pttFabStyle(pttStatus)]}
            activeOpacity={0.8}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          >
            <Ionicons
              name={pttIconName(pttStatus)}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  askAiFab: {
    position: "absolute",
    right: 16,
  },
  askAiFabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
});
