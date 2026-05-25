import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppSettings, ThemeMode } from "@/types";
import * as api from "@/lib/tauri";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDataStore } from "@/stores/dataStore";
import { applyTheme } from "@/utils/theme";

export function GeneralSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const addToast = useUIStore((s) => s.addToast);
  const reloadSettingsStore = useSettingsStore((s) => s.load);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      applyTheme(s.theme as ThemeMode);
    });
  }, []);

  const handleTheme = async (key: ThemeMode) => {
    applyTheme(key);
    try {
      await api.updateSettings({ theme: key });
      setSettings((s) => s ? { ...s, theme: key } : s);
      reloadSettingsStore();
      addToast(t('settings.themeChanged'), "success");
    } catch (e) { addToast(t('settings.fail', { error: String(e) }), "error"); }
  };

  const handleCurrency = async (key: string) => {
    try {
      await api.updateSettings({ defaultCurrency: key });
      setSettings((s) => s ? { ...s, defaultCurrency: key } : s);
      reloadSettingsStore();
      useDataStore.getState().triggerRefresh();
      addToast(t('settings.currencyChanged'), "success");
    } catch (e) { addToast(t('settings.fail', { error: String(e) }), "error"); }
  };

  const handleLanguage = async (key: string) => {
    if (key === i18n.language) return;
    i18n.changeLanguage(key);
    try {
      await api.updateSettings({ locale: key });
      reloadSettingsStore();
      addToast(t('settings.languageChanged'), "success");
    } catch (e) { addToast(t('settings.fail', { error: String(e) }), "error"); }
  };

  const themeKey = settings?.theme || "system";
  const c = settings?.defaultCurrency || "CNY";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('settings.general')}</h3>

      {/* Theme */}
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.theme')}</label>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as ThemeMode[]).map((key) => (
            <button
              key={key}
              onClick={() => handleTheme(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all
                ${themeKey === key ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
            >
              <span>{key === "light" ? "☀️" : key === "dark" ? "🌙" : "💻"}</span>
              <span>{key === "light" ? t('settings.light') : key === "dark" ? t('settings.dark') : t('settings.system')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.language')}</label>
        <div className="flex gap-2">
          {(["zh-CN", "en-US"] as const).map((key) => (
            <button
              key={key}
              onClick={() => handleLanguage(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all
                ${i18n.language === key ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
            >
              <span>{key === "zh-CN" ? t('settings.zhCN') : t('settings.enUS')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Default Currency */}
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.defaultCurrency')}</label>
        <select
          value={c}
          onChange={(e) => handleCurrency(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
        >
          <option value="CNY">{t('settings.cny')}</option>
          <option value="USD">{t('settings.usd')}</option>
          <option value="EUR">{t('settings.eur')}</option>
          <option value="JPY">{t('settings.jpy')}</option>
        </select>
      </div>

      {/* Data Storage Path */}
      <DataPathSetting />

      {settings && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.deviceId')}: {settings.deviceId.slice(0, 8)}...</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.dataVersion')}: {settings.dataVersion}</p>
        </div>
      )}
    </div>
  );
}

function DataPathSetting() {
  const { t } = useTranslation();
  const [dbPath, setDbPath] = useState("");
  const [customPath, setCustomPath] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => { api.getDbPath().then(setDbPath); }, []);

  const handleBrowse = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: i18n.t("settings.browse") });
      if (selected && typeof selected === "string") {
        setCustomPath(selected.replace(/\\/g, "/") + "/fastcoin.db");
      }
    } catch (e) { addToast(t("settings.browseFail", { error: String(e) }), "error"); }
  };

  const handleSave = async () => {
    if (!customPath) { addToast(t("settings.enterNewPath"), "error"); return; }
    setIsSaving(true);
    try {
      const newPath = await api.setDbPath(customPath);
      setDbPath(newPath); setCustomPath("");
      addToast(t("settings.pathUpdated"), "success");
    } catch (e) { addToast(t("settings.fail", { error: String(e) }), "error"); }
    finally { setIsSaving(false); }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      setDbPath(await api.resetDbPath()); setCustomPath("");
      addToast(t("settings.resetDone"), "success");
    } catch (e) { addToast(t("settings.fail", { error: String(e) }), "error"); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.dataPath')}</label>
      <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 rounded-lg p-2 break-all font-mono">{dbPath || t('settings.loading')}</div>
      <div className="flex gap-2">
        <input type="text" value={customPath} onChange={(e) => setCustomPath(e.target.value)}
          placeholder="D:\Data\fastcoin.db"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-gray-400 dark:placeholder:text-gray-500" />
        <button onClick={handleBrowse} className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0">📁</button>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!customPath || isSaving}
          className="flex-1 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40">{t('settings.applyNewPath')}</button>
        <button onClick={handleReset} disabled={isSaving}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40">{t('settings.resetDefault')}</button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.restartNotice')}</p>
    </div>
  );
}
