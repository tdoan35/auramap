import { KaraokeWord } from "@/types";

/**
 * Estimate per-word timings from a transcript and total duration.
 * Uses a simple linear distribution — each word gets an equal share of time.
 * Approximate but sufficient for demo purposes.
 */
export function estimateWordTimings(
  transcript: string,
  durationMs: number
): KaraokeWord[] {
  const words = transcript.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const msPerWord = durationMs / words.length;

  return words.map((word, i) => ({
    word,
    startMs: Math.floor(i * msPerWord),
    endMs: Math.floor((i + 1) * msPerWord),
  }));
}

/**
 * Given the current playback position, return the index of the active word.
 * Uses binary search for efficiency.
 * Returns -1 if position is before any word.
 */
export function getActiveWordIndex(
  words: KaraokeWord[],
  positionMs: number
): number {
  if (words.length === 0) return -1;
  if (positionMs < words[0].startMs) return -1;
  if (positionMs >= words[words.length - 1].endMs) return words.length - 1;

  let lo = 0;
  let hi = words.length - 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (positionMs < words[mid].startMs) {
      hi = mid - 1;
    } else if (positionMs >= words[mid].endMs) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  // Fallback: return closest word
  return Math.min(lo, words.length - 1);
}
