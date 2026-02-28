import { create } from "zustand";
import { AppPhase } from "@/types";

interface AppStore {
  phase: AppPhase;
  routeMode: "direct" | "scenic";

  setPhase: (phase: AppPhase) => void;
  setRouteMode: (mode: "direct" | "scenic") => void;
  resetToSetup: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  phase: "WELCOME",
  routeMode: "scenic",

  setPhase: (phase) => set({ phase }),
  setRouteMode: (mode) => set({ routeMode: mode }),
  resetToSetup: () => set({ phase: "ROUTE_SETUP", routeMode: "scenic" }),
}));
