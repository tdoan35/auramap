import { create } from "zustand";
import { Segment, SegmentType, SSEReasoningEvent, SSEOutlineEvent } from "@/types";

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
  tourTheme: string | null;
  generationPhase: string | null;
  isGenerating: boolean;
  isComplete: boolean;
  error: string | null;
  reasoning: ReasoningMessage[];

  startGeneration: (tourId: string) => void;
  setPhase: (phase: string) => void;
  setOutline: (event: SSEOutlineEvent) => void;
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
  tourTheme: null,
  generationPhase: null,
  isGenerating: false,
  isComplete: false,
  error: null,
  reasoning: [],

  startGeneration: (tourId) =>
    set({
      tourId,
      segments: [],
      tourTheme: null,
      generationPhase: "starting",
      isGenerating: true,
      isComplete: false,
      error: null,
      reasoning: [],
    }),

  setPhase: (phase) => set({ generationPhase: phase }),

  setOutline: (event) =>
    set({
      tourTheme: event.theme,
      segments: event.segments.map((seg) => ({
        id: seg.segment_id,
        type: seg.type as SegmentType,
        label: seg.label,
        status: "pending" as const,
        audioUrl: null,
        transcript: null,
        durationS: seg.estimated_duration_s,
      })),
    }),

  addSegment: (segment) =>
    set((state) => {
      // If the segment already exists (from outline), update it in place
      const existingIdx = state.segments.findIndex((s) => s.id === segment.id);
      if (existingIdx >= 0) {
        const updated = [...state.segments];
        updated[existingIdx] = segment;
        return { segments: updated };
      }
      // Otherwise append (fallback for no-outline case)
      return { segments: [...state.segments, segment] };
    }),

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
      tourTheme: null,
      generationPhase: null,
      isGenerating: false,
      isComplete: false,
      error: null,
      reasoning: [],
    }),
}));
