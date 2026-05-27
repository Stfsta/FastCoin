import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_NOTE_HISTORY = 20;

interface NoteHistoryState {
  notes: string[];
  addNote: (note: string) => void;
  removeNote: (note: string) => void;
  clearHistory: () => void;
}

export const useNoteHistoryStore = create<NoteHistoryState>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (note) =>
        set((state) => {
          const trimmed = note.trim();
          if (!trimmed) return state;
          const filtered = state.notes.filter((n) => n !== trimmed);
          return { notes: [trimmed, ...filtered].slice(0, MAX_NOTE_HISTORY) };
        }),
      removeNote: (note) =>
        set((state) => ({
          notes: state.notes.filter((n) => n !== note),
        })),
      clearHistory: () => set({ notes: [] }),
    }),
    { name: "fastcoin-note-history" }
  )
);
