import { LatLng, POI } from "@/types";
import {
  GOOGLE_MAPS_API_KEY,
  POI_DISCOVERY_RADIUS_M,
  POI_DISPLAY_LIMIT,
  POI_SAMPLE_POINTS,
} from "@/utils/constants";
import { samplePointsAlongPath } from "@/utils/polyline";

/**
 * Discover POIs along a route by sampling points and querying Google Places Nearby Search.
 * Deduplicates results and returns top results sorted by rating.
 */
export async function discoverPOIs(
  polyline: LatLng[],
  radiusM: number = POI_DISCOVERY_RADIUS_M
): Promise<POI[]> {
  const samplePoints = samplePointsAlongPath(polyline, POI_SAMPLE_POINTS);
  const seen = new Set<string>();
  const allPOIs: POI[] = [];

  // Query each sample point in parallel
  const results = await Promise.allSettled(
    samplePoints.map((point) => searchNearby(point, radiusM))
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const poi of result.value) {
      if (!seen.has(poi.place_id)) {
        seen.add(poi.place_id);
        allPOIs.push(poi);
      }
    }
  }

  // Sort by rating (descending), then limit
  allPOIs.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return allPOIs.slice(0, POI_DISPLAY_LIMIT);
}

async function searchNearby(center: LatLng, radiusM: number): Promise<POI[]> {
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${center.latitude},${center.longitude}` +
    `&radius=${radiusM}` +
    `&type=tourist_attraction` +
    `&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.warn("Places API error:", data.status);
    return [];
  }

  return (data.results || []).map((place: any) => ({
    place_id: place.place_id,
    name: place.name,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    types: place.types || [],
    rating: place.rating ?? null,
  }));
}
