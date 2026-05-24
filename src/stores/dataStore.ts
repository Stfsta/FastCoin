import { create } from "zustand";

interface DataState {
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
