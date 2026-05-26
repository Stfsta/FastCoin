export type ThemeMode = "light" | "dark" | "system";
export type SupportedLocale = "zh-CN" | "en-US";

export interface AppSettings {
  id: "singleton";
  defaultCurrency: string;
  defaultSourceId: string | null;
  activePeriodId: string | null;
  theme: ThemeMode;
  locale: SupportedLocale;
  keySalt: string | null;
  deviceId: string;
  dataVersion: number;
  lastExportedVersion: number;
  lastImportedVersion: number;
}
