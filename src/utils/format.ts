import { useSettingsStore } from "@/stores/settingsStore";

export function formatAmount(cents: number): string {
  const symbol = useSettingsStore.getState().getCurrencySymbol();
  const yuan = (cents / 100).toFixed(2);
  return `${symbol}${yuan}`;
}

export function centsToYuan(cents: number): string {
  return (cents / 100).toFixed(2);
}
