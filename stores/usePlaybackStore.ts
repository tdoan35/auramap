import { create } from "zustand";

interface PlaybackStore {
  isPlaying: boolean;
  currentSegmentId: number | null;
  currentPositionMs: number;
  activeCard: "outline" | "player";

  play: () => void;
  pause: () => void;
  setCurrentSegment: (id: number) => void;
  updatePosition: (ms: number) => void;
  setActiveCard: (card: "outline" | "player") => void;
  reset: () => void;
}

export const usePlaybackStore = create<PlaybackStore>((set) => ({
  isPlaying: false,
  currentSegmentId: null,
  currentPositionMs: 0,
  activeCard: "outline",

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setCurrentSegment: (id) => set({ currentSegmentId: id, currentPositionMs: 0 }),
  updatePosition: (ms) => set({ currentPositionMs: ms }),
  setActiveCard: (card) => set({ activeCard: card }),
  reset: () =>
    set({
      isPlaying: false,
      currentSegmentId: null,
      currentPositionMs: 0,
      activeCard: "outline",
    }),
}));
