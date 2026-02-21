import { create } from "zustand";

type ModeState = {
  mode: "single" | "double";
  setMode: (mode: "single" | "double") => void;
};

export const useModeStore = create<ModeState>((set) => ({
  mode: "single",
  setMode: (mode) => set({ mode }),
}));
