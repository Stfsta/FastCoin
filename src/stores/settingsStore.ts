import { create } from "zustand";
import type { AppSettings } from "@/types";
import * as api from "@/lib/tauri";

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: "¥",
  USD: "$",
  EUR: "€",
  JPY: "¥",
};

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;

  load: () => Promise<void>;
  getCurrencySymbol: () => string;
  getLocale: () => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: true,

  load: async () => {
    try {
      const s = await api.getSettings();
      set({ settings: s, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  getCurrencySymbol: () => {
    const s = get().settings;
    return s ? CURRENCY_SYMBOLS[s.defaultCurrency] || "¥" : "¥";
  },

  getLocale: () => {
    return get().settings?.locale || "zh-CN";
  },
}));

export { CURRENCY_SYMBOLS };
