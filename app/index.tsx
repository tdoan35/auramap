import React, { useCallback, useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";

import MapViewComponent from "@/components/MapView";
import SearchBar from "@/components/SearchBar";
import BottomCard from "@/components/BottomCard";
import RouteCard from "@/components/RouteCard";
import OutlineCard from "@/components/OutlineCard";
import AudioPlayerCard from "@/components/AudioPlayerCard";
import SwipeableCardContainer from "@/components/SwipeableCardContainer";

import { useAppStore } from "@/stores/useAppStore";
import { useRouteStore } from "@/stores/useRouteStore";
import { useTourStore } from "@/stores/useTourStore";
import { usePlaybackStore } from "@/stores/usePlaybackStore";

import { getWalkingRoute } from "@/services/directionsService";
import { discoverPOIs } from "@/services/placesService";
import { connectToTourStream } from "@/services/sseService";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

import { Location, TourGenerateRequest, Segment } from "@/types";

// Default start location (Moscone Center, SF)
const DEFAULT_START: Location = {
  lat: 37.7844,
  lng: -122.4006,
  name: "Moscone Center",
};

export default function MainScreen() {
  const phase = useAppStore((s) => s.phase);
  const setPhase = useAppStore((s) => s.setPhase);
  const routeMode = useAppStore((s) => s.routeMode);

  const setStart = useRouteStore((s) => s.setStart);
  const setEnd = useRouteStore((s) => s.setEnd);
  const setRoute = useRouteStore((s) => s.setRoute);
  const setDiscoveredPOIs = useRouteStore((s) => s.setDiscoveredPOIs);
  const updateLegs = useRouteStore((s) => s.updateLegs);

  const startGeneration = useTourStore((s) => s.startGeneration);
  const addSegment = useTourStore((s) => s.addSegment);
  const setTourPhase = useTourStore((s) => s.setPhase);
  const setComplete = useTourStore((s) => s.setComplete);
  const setError = useTourStore((s) => s.setError);
  const addReasoning = useTourStore((s) => s.addReasoning);
  const segments = useTourStore((s) => s.segments);

  const setActiveCard = usePlaybackStore((s) => s.setActiveCard);

  const sseRef = useRef<{ close: () => void } | null>(null);

  const { handlePlayPause, handleSkipNext, loadAndPlaySegment } = useAudioPlayer();

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

        // Transition to route customization
        setPhase("ROUTE_CUSTOMIZATION");
      } catch (err) {
        console.error("Route/POI error:", err);
      }
    },
    [setStart, setEnd, setRoute, setDiscoveredPOIs, updateLegs, setPhase]
  );

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
  }, [routeMode, startGeneration, setPhase, setTourPhase, addSegment, addReasoning, setComplete, setError]);

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

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      <MapViewComponent />

      {/* Search bar — visible only in ROUTE_SETUP */}
      {phase === "ROUTE_SETUP" && (
        <SearchBar onPlaceSelected={handlePlaceSelected} />
      )}

      {/* Bottom card — visible after route is set */}
      {phase === "ROUTE_CUSTOMIZATION" && (
        <BottomCard>
          <RouteCard onStartTour={handleStartTour} />
        </BottomCard>
      )}

      {phase === "TOUR_LOADING" && (
        <BottomCard expandable={false}>
          <OutlineCard onPlay={handlePlay} canPlay={canPlay} />
        </BottomCard>
      )}

      {phase === "TOUR_PLAYBACK" && (
        <BottomCard expandable={false}>
          <SwipeableCardContainer>
            <OutlineCard onPlay={handlePlayPause} canPlay={canPlay} />
            <AudioPlayerCard
              onPlayPause={handlePlayPause}
              onSkipNext={handleSkipNext}
            />
          </SwipeableCardContainer>
        </BottomCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
