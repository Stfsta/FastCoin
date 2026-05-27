import { invoke } from "@tauri-apps/api/core";
import type {
  Expense,
  PaymentSource,
  Category,
  AccountingPeriod,
  AppSettings,
  ImportDiff,
  MergeStrategy,
} from "@/types";

// ─── Expenses ────────────────────────────────────────

export async function getExpenses(params?: {
  startDate?: string;
  endDate?: string;
  sourceId?: string;
  limit?: number;
}): Promise<Expense[]> {
  return invoke("get_expenses", {
    startDate: params?.startDate ?? null,
    endDate: params?.endDate ?? null,
    sourceId: params?.sourceId ?? null,
    limit: params?.limit ?? null,
  });
}

export async function addExpense(data: {
  amount: number;
  currency: string;
  sourceId: string;
  categoryId: string | null;
  note: string;
  date: string;
}): Promise<Expense> {
  return invoke("add_expense", {
    amount: data.amount,
    currency: data.currency,
    sourceId: data.sourceId,
    categoryId: data.categoryId,
    note: data.note,
    date: data.date,
  });
}

export async function updateExpense(args: {
  id: string;
  amount?: number;
  sourceId?: string;
  categoryId?: string | null;
  note?: string;
  date?: string;
}): Promise<Expense> {
  return invoke("update_expense", { args });
}

export async function deleteExpense(id: string): Promise<void> {
  return invoke("delete_expense", { id });
}

// ─── Payment Sources ─────────────────────────────────

export async function getPaymentSources(): Promise<PaymentSource[]> {
  return invoke("get_payment_sources");
}

export async function addPaymentSource(data: {
  name: string;
  sourceType: string;
  icon: string;
  color: string;
}): Promise<PaymentSource> {
  return invoke("add_payment_source", {
    name: data.name,
    sourceType: data.sourceType,
    icon: data.icon,
    color: data.color,
  });
}

export async function updatePaymentSource(data: {
  id: string;
  name?: string;
  sourceType?: string;
  icon?: string;
  color?: string;
}): Promise<void> {
  return invoke("update_payment_source", { ...data });
}

export async function deletePaymentSource(id: string): Promise<void> {
  return invoke("delete_payment_source", { id });
}

export async function reorderPaymentSources(ids: string[]): Promise<void> {
  return invoke("reorder_payment_sources", { ids });
}

// ─── Categories ──────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return invoke("get_categories");
}

export async function addCategory(data: {
  name: string;
  icon: string;
  color: string;
  parentId?: string | null;
}): Promise<Category> {
  return invoke("add_category", {
    name: data.name,
    icon: data.icon,
    color: data.color,
    parentId: data.parentId ?? null,
  });
}

export async function updateCategory(data: {
  id: string;
  name?: string;
  icon?: string;
  color?: string;
}): Promise<void> {
  return invoke("update_category", { ...data });
}

export async function deleteCategory(id: string): Promise<void> {
  return invoke("delete_category", { id });
}

// ─── Accounting Periods ──────────────────────────────

export async function getPeriods(): Promise<AccountingPeriod[]> {
  return invoke("get_periods");
}

export async function addPeriod(data: {
  name: string;
  startDate: string;
  endDate: string;
}): Promise<AccountingPeriod> {
  return invoke("add_period", {
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
  });
}

export async function updatePeriod(data: {
  id: string;
  name?: string;
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  return invoke("update_period", { ...data });
}

export async function deletePeriod(id: string): Promise<void> {
  return invoke("delete_period", { id });
}

export async function setActivePeriod(id: string): Promise<void> {
  return invoke("set_active_period", { id });
}

// ─── Settings ────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  return invoke("get_settings");
}

export async function updateSettings(args: {
  defaultCurrency?: string;
  defaultSourceId?: string | null;
  activePeriodId?: string | null;
  theme?: string;
  locale?: string;
  lastExportedVersion?: number;
}): Promise<void> {
  return invoke("update_settings", { args });
}

// ─── Stats ───────────────────────────────────────────

export interface StatsResponse {
  periodTotal: number;
  dailyAverage: number;
  daysElapsed: number;
  daysTotal: number;
  todayTotal: number;
  perSource: Array<{
    sourceId: string;
    sourceName: string;
    sourceIcon: string;
    sourceColor: string;
    total: number;
  }>;
  dailySeries: Array<{ date: string; total: number }>;
}

export async function getStats(periodId: string): Promise<StatsResponse> {
  return invoke("get_stats", { periodId });
}

// ─── Config / Data Path ──────────────────────────────

export async function getDbPath(): Promise<string> {
  return invoke("get_db_path");
}

export async function setDbPath(newPath: string): Promise<string> {
  return invoke("set_db_path", { newPath });
}

export async function resetDbPath(): Promise<string> {
  return invoke("reset_db_path");
}

// ─── Export / Import ─────────────────────────────────

export async function exportData(
  password: string,
  mode: string,
  format: string,
  filePath: string,
  date?: string,
): Promise<void> {
  return invoke("export_data", { password, mode, format, filePath, date: date ?? null });
}

export async function importPreview(
  filePath: string,
  password: string,
): Promise<ImportDiff> {
  return invoke("import_preview", { filePath, password });
}

export async function importConfirm(
  filePath: string,
  password: string,
  strategy: MergeStrategy,
): Promise<void> {
  return invoke("import_confirm", { filePath, password, strategy });
}

export async function exportDataToContent(
  password: string,
  mode: string,
  format: string,
  date?: string,
): Promise<string | number[]> {
  const result = await invoke<unknown>("export_data_to_content", {
    password, mode, format, date: date ?? null,
  });
  // Rust returns serde_json::Value: String or Array<Number>
  if (typeof result === "string") return result;
  if (Array.isArray(result)) return result as number[];
  return String(result);
}

export async function exportDataToTemp(
  password: string,
  mode: string,
  format: string,
  date?: string,
): Promise<string> {
  return invoke<string>("export_data_to_temp", {
    password, mode, format, date: date ?? null,
  });
}

export async function importPreviewFromContent(
  fileContent: string,
  password: string,
): Promise<ImportDiff> {
  return invoke("import_preview_from_content", { fileContent, password });
}

export async function importConfirmFromContent(
  fileContent: string,
  password: string,
  strategy: MergeStrategy,
): Promise<void> {
  return invoke("import_confirm_from_content", { fileContent, password, strategy });
}
