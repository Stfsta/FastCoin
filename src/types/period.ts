export interface AccountingPeriod {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD, inclusive
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export type NewAccountingPeriod = Omit<AccountingPeriod, "id" | "createdAt" | "updatedAt" | "version">;
