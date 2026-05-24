/** Monetary amounts stored as integer cents to avoid floating-point errors */
export type Cents = number;

export interface Expense {
  id: string;
  amount: Cents;
  currency: string;
  sourceId: string;
  categoryId: string | null;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: number; // Unix ms
  updatedAt: number;
  version: number;
}

export type NewExpense = Omit<Expense, "id" | "createdAt" | "updatedAt" | "version">;
