import { create } from "zustand";
import { PTTStatus } from "@/types";

interface PTTStore {
  status: PTTStatus;
  responseTranscript: string;
  error: string | null;
  sessionActive: boolean;

  setStatus: (status: PTTStatus) => void;
  appendTranscript: (delta: string) => void;
  clearTranscript: () => void;
  setError: (error: string | null) => void;
  setSessionActive: (active: boolean) => void;
  reset: () => void;
}

export const usePTTStore = create<PTTStore>((set) => ({
  status: "idle",
  responseTranscript: "",
  error: null,
  sessionActive: false,

  setStatus: (status) => set({ status }),
  appendTranscript: (delta) =>
    set((state) => ({ responseTranscript: state.responseTranscript + delta })),
  clearTranscript: () => set({ responseTranscript: "" }),
  setError: (error) => set({ error, status: error ? "error" : "idle" }),
  setSessionActive: (active) => set({ sessionActive: active }),
  reset: () =>
    set({
      status: "idle",
      responseTranscript: "",
      error: null,
      sessionActive: false,
    }),
}));
