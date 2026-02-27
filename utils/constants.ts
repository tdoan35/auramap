import { Platform } from "react-native";

// Backend API base URL — set to laptop IP or ngrok URL
// For physical device: use your laptop's local IP
// For simulator: localhost works fine
export const API_BASE_URL = "http://100.105.40.85:8000";

// Google Maps API key (loaded from app.json > extra or hardcoded for hackathon)
export const GOOGLE_MAPS_API_KEY = "AIzaSyAfrNAnatP8FaKPJUir75pQIEme-Khk1f0";

// POI discovery
export const POI_DISCOVERY_RADIUS_M = 200;
export const POI_DISPLAY_LIMIT = 7;
export const POI_SELECTION_LIMIT = 4;
export const POI_SAMPLE_POINTS = 4;

// TTS calibration
export const WORDS_PER_MINUTE = 150;
export const TRANSIT_FILL_RATIO = 0.85; // Transit audio fills 85% of walk time

// Audio playback
export const KARAOKE_POLL_INTERVAL_MS = 33;
export const SEGMENT_GAP_MS = 2500; // Gap between segments

// Default map region (San Francisco)
export const SF_DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Tour generation timeouts
export const TOUR_GENERATION_TIMEOUT_S = 30;
export const SEGMENT_GENERATION_TIMEOUT_S = 10;
