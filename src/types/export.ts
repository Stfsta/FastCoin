import type { Expense, PaymentSource, Category, AccountingPeriod, AppSettings } from "./index";

export type ExportMode = "full" | "incremental";
export type ExportFormat = "fastcoin" | "xlsx" | "csv";

export interface ExportMetadata {
  formatVersion: 1;
  mode: ExportMode;
  exportedAt: string; // ISO 8601
  deviceId: string;
  recordCount: number;
  sinceVersion?: number;
  untilVersion: number;
}

export interface ExportPayload {
  metadata: ExportMetadata;
  expenses: Expense[];
  paymentSources: PaymentSource[];
  categories: Category[];
  accountingPeriods: AccountingPeriod[];
  settings: Omit<AppSettings, "keySalt">;
}

export interface EncryptedFile {
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  metadata: Omit<ExportMetadata, "sinceVersion">;
}

export interface ImportDiff {
  expenses: { new: number; updated: number; unchanged: number };
  paymentSources: { new: number; updated: number; unchanged: number };
  categories: { new: number; updated: number; unchanged: number };
  accountingPeriods: { new: number; updated: number; unchanged: number };
  settings: "same" | "different";
}

export type MergeStrategy = "import_newer" | "keep_local" | "import_all";
