import { create } from "zustand";
import { Location, POI, RouteLeg, LatLng } from "@/types";
import { POI_SELECTION_LIMIT } from "@/utils/constants";

interface RouteStore {
  startLocation: Location | null;
  endLocation: Location | null;
  polyline: LatLng[];
  encodedPolyline: string | null;
  totalDistanceM: number;
  totalDurationS: number;
  legs: RouteLeg[];
  discoveredPOIs: POI[];
  selectedPOIIds: string[];
  stops: POI[];

  setStart: (location: Location) => void;
  setEnd: (location: Location) => void;
  setRoute: (
    encodedPolyline: string,
    decodedPath: LatLng[],
    distance: number,
    duration: number
  ) => void;
  setDiscoveredPOIs: (pois: POI[]) => void;
  togglePOI: (placeId: string) => void;
  removeStop: (placeId: string) => void;
  updateLegs: (legs: RouteLeg[]) => void;
  setStops: (stops: POI[]) => void;
  clearRoute: () => void;
}

export const useRouteStore = create<RouteStore>((set, get) => ({
  startLocation: null,
  endLocation: null,
  polyline: [],
  encodedPolyline: null,
  totalDistanceM: 0,
  totalDurationS: 0,
  legs: [],
  discoveredPOIs: [],
  selectedPOIIds: [],
  stops: [],

  setStart: (location) => set({ startLocation: location }),
  setEnd: (location) => set({ endLocation: location }),

  setRoute: (encodedPolyline, decodedPath, distance, duration) =>
    set({
      encodedPolyline,
      polyline: decodedPath,
      totalDistanceM: distance,
      totalDurationS: duration,
    }),

  setDiscoveredPOIs: (pois) => set({ discoveredPOIs: pois }),

  togglePOI: (placeId) => {
    const { selectedPOIIds, discoveredPOIs, stops } = get();
    if (selectedPOIIds.includes(placeId)) {
      // Deselect
      set({
        selectedPOIIds: selectedPOIIds.filter((id) => id !== placeId),
        stops: stops.filter((s) => s.place_id !== placeId),
      });
    } else {
      // Select — enforce max limit
      if (selectedPOIIds.length >= POI_SELECTION_LIMIT) return;
      const poi = discoveredPOIs.find((p) => p.place_id === placeId);
      if (!poi) return;
      set({
        selectedPOIIds: [...selectedPOIIds, placeId],
        stops: [...stops, poi],
      });
    }
  },

  removeStop: (placeId) => {
    const { selectedPOIIds, stops } = get();
    set({
      selectedPOIIds: selectedPOIIds.filter((id) => id !== placeId),
      stops: stops.filter((s) => s.place_id !== placeId),
    });
  },

  updateLegs: (legs) => set({ legs }),

  setStops: (stops) =>
    set({
      stops,
      selectedPOIIds: stops.map((s) => s.place_id),
    }),

  clearRoute: () =>
    set({
      startLocation: null,
      endLocation: null,
      polyline: [],
      encodedPolyline: null,
      totalDistanceM: 0,
      totalDurationS: 0,
      legs: [],
      discoveredPOIs: [],
      selectedPOIIds: [],
      stops: [],
    }),
}));
