import { LatLng, RouteLeg } from "@/types";
import { GOOGLE_MAPS_API_KEY } from "@/utils/constants";
import { decodePolyline } from "@/utils/polyline";

interface DirectionsResult {
  encodedPolyline: string;
  decodedPath: LatLng[];
  totalDistanceM: number;
  totalDurationS: number;
  legs: RouteLeg[];
  waypointOrder: number[];
}

export async function getWalkingRoute(
  origin: LatLng,
  destination: LatLng,
  waypoints?: LatLng[]
): Promise<DirectionsResult> {
  let url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=walking` +
    `&key=${GOOGLE_MAPS_API_KEY}`;

  if (waypoints && waypoints.length > 0) {
    const waypointStr = waypoints
      .map((w) => `${w.latitude},${w.longitude}`)
      .join("|");
    url += `&waypoints=optimize:true|${waypointStr}`;
  }

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.routes?.length) {
    throw new Error(`Directions API error: ${data.status}`);
  }

  const route = data.routes[0];
  const encodedPolyline = route.overview_polyline.points;
  const decodedPath = decodePolyline(encodedPolyline);

  let totalDistanceM = 0;
  let totalDurationS = 0;
  const legs: RouteLeg[] = route.legs.map((leg: any) => {
    totalDistanceM += leg.distance.value;
    totalDurationS += leg.duration.value;
    return {
      start_name: leg.start_address,
      end_name: leg.end_address,
      distance_m: leg.distance.value,
      duration_s: leg.duration.value,
    };
  });

  return {
    encodedPolyline,
    decodedPath,
    totalDistanceM,
    totalDurationS,
    legs,
    waypointOrder: route.waypoint_order || [],
  };
}
