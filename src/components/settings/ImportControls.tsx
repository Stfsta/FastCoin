import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { invoke } from "@tauri-apps/api/core";
import * as api from "@/lib/tauri";
import type { ImportDiff, MergeStrategy } from "@/types";
import type { ThemeMode } from "@/types";
import { useUIStore } from "@/stores/uiStore";
import { useDataStore } from "@/stores/dataStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { applyTheme } from "@/utils/theme";
import { Button } from "@/components/common/Button";

async function showOpenDialog(): Promise<string | null> {
  try {
    const mod = await import("@tauri-apps/plugin-dialog");
    if (mod.open) {
      const result = await mod.open({
        filters: [{ name: "FastCoin File", extensions: ["fastcoin", "json"] }],
        multiple: false,
      });
      return result as string | null;
    }
  } catch { /* fall through */ }
  try {
    return await invoke("plugin:dialog|open", {
      options: {
        filters: [{ name: "FastCoin File", extensions: ["fastcoin", "json"] }],
        multiple: false,
      },
    });
  } catch { /* fall through */ }
  return prompt("Enter file path:");
}

export function ImportControls() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [diff, setDiff] = useState<ImportDiff | null>(null);
  const [filePath, setFilePath] = useState("");
  const [manualPath, setManualPath] = useState("");
  const addToast = useUIStore((s) => s.addToast);

  const handleSelectFile = async () => {
    let path = await showOpenDialog();
    if (!path && manualPath) path = manualPath;
    if (path) {
      setFilePath(path);
      setDiff(null);
    }
  };

  const handlePreview = async () => {
    const fp = filePath || manualPath;
    if (!fp || !password) { addToast(t('settings.needFilePw'), "error"); return; }
    if (fp !== filePath) setFilePath(fp);
    setIsImporting(true);
    try {
      setDiff(await api.importPreview(fp, password));
    } catch (e) {
      addToast(t('settings.previewFail', { error: String(e) }), "error");
      setDiff(null);
    } finally { setIsImporting(false); }
  };

  const handleConfirm = async (strategy: MergeStrategy) => {
    const fp = filePath || manualPath;
    if (!fp || !password) return;
    setIsImporting(true);
    try {
      await api.importConfirm(fp, password, strategy);
      // Refresh all data immediately after import
      useDataStore.getState().triggerRefresh();
      useExpenseStore.getState().fetchExpenses();
      await useSettingsStore.getState().load();
      const newSettings = useSettingsStore.getState().settings;
      if (newSettings) {
        if (newSettings.locale !== i18n.language) i18n.changeLanguage(newSettings.locale);
        applyTheme(newSettings.theme as ThemeMode);
      }
      addToast(t('settings.importSuccess'), "success");
      setDiff(null); setFilePath(""); setManualPath(""); setPassword("");
    } catch (e) { addToast(t('settings.importFail', { error: String(e) }), "error"); }
    finally { setIsImporting(false); }
  };

  return (
    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('settings.import')}</h3>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleSelectFile}>
          {filePath ? t('settings.selected', { name: filePath.split(/[/\\]/).pop() }) : t('settings.selectFile')}
        </Button>
      </div>

      <div>
        <input type="text" value={manualPath}
          onChange={(e) => setManualPath(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
          placeholder={t('settings.manualPath')} />
      </div>

      <div className="relative">
        <input type={showPw ? "text" : "password"} value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
          placeholder={t('settings.importPassword')} />
        <button onClick={() => setShowPw(!showPw)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          type="button"
        >
          {showPw ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      <Button variant="secondary" className="w-full" onClick={handlePreview} isLoading={isImporting}>
        {t('settings.preview')}
      </Button>

      {diff && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('settings.importPreview')}</h4>
          <DiffRow label={t('settings.expenseRecords')} counts={diff.expenses} />
          <DiffRow label={t('settings.paymentSources')} counts={diff.paymentSources} />
          <DiffRow label={t('settings.categories')} counts={diff.categories} />
          <DiffRow label={t('settings.accountingPeriods')} counts={diff.accountingPeriods} />
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => handleConfirm("import_newer")} isLoading={isImporting}>
              {t('settings.merge')} ({t('settings.keepNewer')})
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleConfirm("import_all")} isLoading={isImporting}>
              {t('settings.overwriteAll')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffRow({ label, counts }: { label: string; counts: { new: number; updated: number; unchanged: number } }) {
  const { t } = useTranslation();
  const total = counts.new + counts.updated + counts.unchanged;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex gap-2 text-xs">
        {counts.new > 0 && <span className="text-green-600 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">+{counts.new} {t('settings.newCount')}</span>}
        {counts.updated > 0 && <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">~{counts.updated} {t('settings.updatedCount')}</span>}
        {counts.unchanged > 0 && <span className="text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded">{counts.unchanged} {t('settings.unchangedCount')}</span>}
        {total === 0 && <span className="text-gray-400 dark:text-gray-500">{t('settings.noData')}</span>}
      </div>
    </div>
  );
}
