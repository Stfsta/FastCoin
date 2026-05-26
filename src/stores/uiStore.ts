import { create } from "zustand";

export type MobilePanel = "entry" | "stats" | "settings";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface UIState {
  activeMobilePanel: MobilePanel;
  panelHistory: MobilePanel[];
  toasts: Toast[];
  // Panel widths as fractions (0–1), left + center + right = 1
  leftWidth: number;
  rightWidth: number;
  // Left panel vertical split: form takes this fraction, list takes remainder
  leftFormFraction: number;
  // Date selected in the expense form (yyyy-MM-dd)
  selectedDate: string;

  setActiveMobilePanel: (panel: MobilePanel) => void;
  goBack: () => boolean;
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
  setLeftWidth: (w: number) => void;
  setRightWidth: (w: number) => void;
  setLeftFormFraction: (f: number) => void;
  setSelectedDate: (date: string) => void;
}

const MIN_PANEL = 0.12;
const MAX_PANEL = 0.45;

export const useUIStore = create<UIState>((set, get) => ({
  activeMobilePanel: "entry",
  panelHistory: [],
  toasts: [],
  leftWidth: 0.22,
  rightWidth: 0.25,
  leftFormFraction: 0.5,
  selectedDate: new Date().toISOString().slice(0, 10),

  setActiveMobilePanel: (panel) => set((state) => ({
    activeMobilePanel: panel,
    panelHistory: [...state.panelHistory, state.activeMobilePanel],
  })),

  goBack: () => {
    const history = get().panelHistory;
    if (history.length === 0) return false;
    const prev = history[history.length - 1];
    set({ activeMobilePanel: prev, panelHistory: history.slice(0, -1) });
    return true;
  },

  addToast: (message, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  setLeftWidth: (w) => set({ leftWidth: Math.min(MAX_PANEL, Math.max(MIN_PANEL, w)) }),
  setRightWidth: (w) => set({ rightWidth: Math.min(MAX_PANEL, Math.max(MIN_PANEL, w)) }),
  setLeftFormFraction: (f) => set({ leftFormFraction: Math.min(0.85, Math.max(0.2, f)) }),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
