import { useState, useEffect, useCallback } from "react";
import type { AppSettings, ThemeMode, SupportedLocale } from "@/types";
import * as api from "@/lib/tauri";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/common/Button";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  }
}

export function GeneralSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [draft, setDraft] = useState<Partial<AppSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      setDraft({});
      applyTheme(s.theme as ThemeMode);
    });
  }, []);

  const patch = useCallback((key: keyof AppSettings, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    // Apply theme immediately for preview
    if (key === "theme") applyTheme(value as ThemeMode);
  }, []);

  const handleSave = async () => {
    if (Object.keys(draft).length === 0) {
      addToast("没有需要保存的更改", "info");
      return;
    }
    setIsSaving(true);
    try {
      await api.updateSettings(draft as Parameters<typeof api.updateSettings>[0]);
      setSettings((prev) => ({ ...prev!, ...draft } as AppSettings));
      setDraft({});
      addToast("设置已保存", "success");
    } catch (e) {
      addToast(`保存失败: ${e}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const current = { ...settings, ...draft } as AppSettings;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">通用设置</h3>
        <Button
          size="sm"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={Object.keys(draft).length === 0}
        >
          保存设置
        </Button>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">主题</label>
        <div className="flex gap-2">
          {([
            { key: "light" as ThemeMode, label: "浅色", icon: "☀️" },
            { key: "dark" as ThemeMode, label: "深色", icon: "🌙" },
            { key: "system" as ThemeMode, label: "跟随系统", icon: "💻" },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => patch("theme", opt.key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all
                ${current.theme === opt.key
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">语言</label>
        <div className="flex gap-2">
          {([
            { key: "zh-CN" as SupportedLocale, label: "中文" },
            { key: "en-US" as SupportedLocale, label: "English" },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => patch("locale", opt.key)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all
                ${current.locale === opt.key
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Default Currency */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">默认货币</label>
        <select
          value={current.defaultCurrency}
          onChange={(e) => patch("defaultCurrency", e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          <option value="CNY">CNY (人民币)</option>
          <option value="USD">USD (美元)</option>
          <option value="EUR">EUR (欧元)</option>
          <option value="JPY">JPY (日元)</option>
        </select>
      </div>

      {Object.keys(draft).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
          有未保存的更改
        </div>
      )}

      {settings && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            设备 ID: {settings.deviceId.slice(0, 8)}...
          </p>
          <p className="text-xs text-gray-400">
            数据版本: {settings.dataVersion}
          </p>
        </div>
      )}
    </div>
  );
}
