export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Location {
  lat: number;
  lng: number;
  name: string;
}

export interface POI {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  types: string[];
  rating: number | null;
}

export interface RouteLeg {
  start_name: string;
  end_name: string;
  distance_m: number;
  duration_s: number;
}

export type SegmentType = "opening" | "transit" | "poi_arrival" | "outro";
export type SegmentStatus = "pending" | "generating" | "ready" | "playing" | "completed";

export interface Segment {
  id: number;
  type: SegmentType;
  label: string;
  status: SegmentStatus;
  audioUrl: string | null;
  transcript: string | null;
  durationS: number | null;
}

export type AppPhase =
  | "WELCOME"
  | "ROUTE_SETUP"
  | "ROUTE_CUSTOMIZATION"
  | "TOUR_LOADING"
  | "TOUR_PLAYBACK";

export interface KaraokeWord {
  word: string;
  startMs: number;
  endMs: number;
}

// SSE event payloads
export interface SSEStatusEvent {
  phase: string;
  message: string;
}

export interface SSESegmentEvent {
  segment_id: number;
  type: string;
  label: string;
  audio_url: string;
  transcript: string;
  duration_s: number;
}

export interface SSEOutlineSegment {
  segment_id: number;
  type: string;
  label: string;
  estimated_duration_s: number;
}

export interface SSEOutlineEvent {
  theme: string;
  segments: SSEOutlineSegment[];
}

export interface SSECompleteEvent {
  tour_id: string;
  total_segments: number;
  total_duration_s: number;
}

export interface SSEReasoningEvent {
  agent: string;
  message: string;
  segment_id?: number;
  score?: number;
  approved?: boolean;
}

export type PTTStatus = "idle" | "connecting" | "listening" | "processing" | "responding" | "error";

export interface TourGenerateRequest {
  route: {
    start: Location;
    end: Location;
    polyline: string;
    total_distance_m: number;
    total_duration_s: number;
  };
  selected_pois: POI[];
  legs: RouteLeg[];
  voice_id: string;
}
