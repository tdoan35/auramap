import { create } from "zustand";
import { Segment, SegmentType, SSEReasoningEvent } from "@/types";

interface ReasoningMessage {
  agent: string;
  message: string;
  segmentId?: number;
  score?: number;
  approved?: boolean;
  timestamp: number;
}

interface TourStore {
  tourId: string | null;
  segments: Segment[];
  generationPhase: string | null;
  isGenerating: boolean;
  isComplete: boolean;
  error: string | null;
  reasoning: ReasoningMessage[];

  startGeneration: (tourId: string) => void;
  setPhase: (phase: string) => void;
  addSegment: (segment: Segment) => void;
  updateSegmentStatus: (id: number, status: Segment["status"]) => void;
  addReasoning: (event: SSEReasoningEvent) => void;
  setComplete: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useTourStore = create<TourStore>((set) => ({
  tourId: null,
  segments: [],
  generationPhase: null,
  isGenerating: false,
  isComplete: false,
  error: null,
  reasoning: [],

  startGeneration: (tourId) =>
    set({
      tourId,
      segments: [],
      generationPhase: "starting",
      isGenerating: true,
      isComplete: false,
      error: null,
      reasoning: [],
    }),

  setPhase: (phase) => set({ generationPhase: phase }),

  addSegment: (segment) =>
    set((state) => ({
      segments: [...state.segments, segment],
    })),

  updateSegmentStatus: (id, status) =>
    set((state) => ({
      segments: state.segments.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    })),

  addReasoning: (event) =>
    set((state) => ({
      reasoning: [
        ...state.reasoning,
        {
          agent: event.agent,
          message: event.message,
          segmentId: event.segment_id,
          score: event.score,
          approved: event.approved,
          timestamp: Date.now(),
        },
      ],
    })),

  setComplete: () =>
    set({ isGenerating: false, isComplete: true, generationPhase: null }),

  setError: (error) =>
    set({ error, isGenerating: false, generationPhase: null }),

  reset: () =>
    set({
      tourId: null,
      segments: [],
      generationPhase: null,
      isGenerating: false,
      isComplete: false,
      error: null,
      reasoning: [],
    }),
}));
