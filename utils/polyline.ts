import { LatLng } from "@/types";

/**
 * Decode a Google Maps encoded polyline string into an array of LatLng coordinates.
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Calculate distance between two points using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng * sinLng;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Sample N evenly spaced points along a polyline path.
 * Used for POI discovery — sample points to search for nearby attractions.
 */
export function samplePointsAlongPath(path: LatLng[], n: number): LatLng[] {
  if (path.length === 0) return [];
  if (path.length === 1 || n <= 1) return [path[0]];

  // Calculate cumulative distances
  const distances: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    distances.push(distances[i - 1] + haversineDistance(path[i - 1], path[i]));
  }
  const totalDistance = distances[distances.length - 1];
  if (totalDistance === 0) return [path[0]];

  const sampled: LatLng[] = [];
  for (let i = 0; i < n; i++) {
    const targetDist = (i / (n - 1)) * totalDistance;

    // Find the segment containing targetDist
    let segIdx = 0;
    while (segIdx < distances.length - 1 && distances[segIdx + 1] < targetDist) {
      segIdx++;
    }

    if (segIdx >= path.length - 1) {
      sampled.push(path[path.length - 1]);
      continue;
    }

    const segStart = distances[segIdx];
    const segEnd = distances[segIdx + 1];
    const segLen = segEnd - segStart;
    const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;

    sampled.push({
      latitude: path[segIdx].latitude + t * (path[segIdx + 1].latitude - path[segIdx].latitude),
      longitude: path[segIdx].longitude + t * (path[segIdx + 1].longitude - path[segIdx].longitude),
    });
  }

  return sampled;
}
