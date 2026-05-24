import { create } from "zustand";
import type { Expense } from "@/types";
import * as api from "@/lib/tauri";
import { useDataStore } from "./dataStore";

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;

  fetchExpenses: (startDate?: string, endDate?: string) => Promise<void>;
  addExpense: (data: {
    amount: number;
    currency: string;
    sourceId: string;
    categoryId: string | null;
    note: string;
    date: string;
  }) => Promise<Expense>;
  updateExpense: (args: {
    id: string;
    amount?: number;
    sourceId?: string;
    categoryId?: string | null;
    note?: string;
    date?: string;
  }) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  isLoading: false,
  error: null,

  fetchExpenses: async (startDate, endDate) => {
    set({ isLoading: true, error: null });
    try {
      const expenses = await api.getExpenses({ startDate, endDate });
      set({ expenses, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addExpense: async (data) => {
    const exp = await api.addExpense(data);
    set((state) => ({
      expenses: [exp, ...state.expenses],
    }));
    useDataStore.getState().triggerRefresh();
    return exp;
  },

  updateExpense: async (args) => {
    const updated = await api.updateExpense(args);
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === args.id ? updated : e)),
    }));
    useDataStore.getState().triggerRefresh();
    return updated;
  },

  deleteExpense: async (id) => {
    await api.deleteExpense(id);
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    }));
    useDataStore.getState().triggerRefresh();
  },

  clearError: () => set({ error: null }),
}));
