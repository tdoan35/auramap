/**
 * Voice Q&A service — expo-av Recording + backend Whisper/GPT-4o/TTS pipeline.
 *
 * Fallback approach: records audio locally, uploads to backend for processing.
 * Higher latency (~3-5s) but zero native module compatibility risk.
 */

import { Alert } from "react-native";
import { Audio } from "expo-av";
import { usePTTStore } from "@/stores/usePTTStore";
import { API_BASE_URL } from "@/utils/constants";

interface TourContext {
  currentSegmentLabel?: string;
  currentTranscript?: string;
  nearbyPois?: string[];
}

// Module-level singleton state
let recording: Audio.Recording | null = null;
let answerSound: Audio.Sound | null = null;

/**
 * Start recording audio from the mic.
 */
export async function startListening(): Promise<void> {
  const store = usePTTStore.getState();
  store.clearTranscript();

  // Request mic permission if not yet granted
  const { granted } = await Audio.requestPermissionsAsync();
  if (!granted) {
    throw new Error("Microphone permission is required for voice questions");
  }

  // Clean up any stale recording from a previous failed attempt
  if (recording) {
    try { await recording.stopAndUnloadAsync(); } catch (e) { /* ignore */ }
    recording = null;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recording = rec;
  store.setStatus("listening");
}

/**
 * Stop recording, upload to backend, play TTS response.
 */
export async function stopListeningAndRespond(tourContext: TourContext): Promise<void> {
  const store = usePTTStore.getState();

  if (!recording) {
    store.setStatus("idle");
    return;
  }

  store.setStatus("processing");

  // Stop recording and get URI
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  recording = null;
  console.log("[PTT] Recording stopped, uri:", uri);

  // Restore audio mode for playback
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
  });

  if (!uri) {
    store.setError("Recording failed — no audio captured");
    return;
  }

  // Upload to backend
  const formData = new FormData();
  formData.append("audio", {
    uri,
    type: "audio/m4a",
    name: "recording.m4a",
  } as any);

  if (tourContext.currentSegmentLabel) {
    formData.append("current_segment_label", tourContext.currentSegmentLabel);
  }
  if (tourContext.currentTranscript) {
    formData.append("current_transcript", tourContext.currentTranscript);
  }
  if (tourContext.nearbyPois?.length) {
    formData.append("nearby_pois", tourContext.nearbyPois.join(", "));
  }

  console.log("[PTT] Uploading to backend...");
  const resp = await fetch(`${API_BASE_URL}/realtime/ask`, {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Voice Q&A failed: ${errText}`);
  }

  const data = await resp.json();
  const { answer, audio_url } = data;
  console.log("[PTT] Backend response:", { answer: answer?.slice(0, 80), audio_url });

  // Show transcript
  store.appendTranscript(answer);

  // Play TTS audio if available
  if (audio_url) {
    store.setStatus("responding");
    const audioUri = audio_url.startsWith("http")
      ? audio_url
      : `${API_BASE_URL}${audio_url}`;

    console.log("[PTT] Loading audio from:", audioUri);
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: false, volume: 1.0 },
      (status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log("[PTT] Playback finished");
          usePTTStore.getState().setStatus("idle");
          sound.unloadAsync();
          answerSound = null;
        }
      }
    );
    answerSound = sound;

    // Explicitly start playback after callback is registered
    console.log("[PTT] Starting playback...");
    await sound.playAsync();
    const playbackStatus = await sound.getStatusAsync();
    console.log("[PTT] Playback status:", JSON.stringify(playbackStatus));
  } else {
    // No audio — just show text for a moment then go idle
    store.setStatus("responding");
    setTimeout(() => {
      usePTTStore.getState().setStatus("idle");
    }, 3000);
  }
}

/**
 * Cancel any in-progress recording or playback.
 */
export async function destroySession(): Promise<void> {
  if (recording) {
    try {
      await recording.stopAndUnloadAsync();
    } catch (e) { /* ignore */ }
    recording = null;
  }

  if (answerSound) {
    try {
      await answerSound.unloadAsync();
    } catch (e) { /* ignore */ }
    answerSound = null;
  }

  const store = usePTTStore.getState();
  store.setSessionActive(false);
  store.setStatus("idle");
}
