import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { writeFile } from "@tauri-apps/plugin-fs";
import * as api from "@/lib/tauri";
import { isAndroid } from "@/lib/platform";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/common/Button";

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-gray-200" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  const labels = ["", "弱", "较弱", "中等", "强", "很强"];
  const colors = ["bg-gray-200", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];
  return { score: s, label: labels[s], color: colors[s] };
}

async function showSaveDialog(defaultName: string, ext: string): Promise<string | null> {
  try {
    const mod = await import("@tauri-apps/plugin-dialog");
    if (mod.save) {
      return await mod.save({
        defaultPath: defaultName,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      });
    }
  } catch { /* fall through */ }
  try {
    return await invoke("plugin:dialog|save", {
      options: {
        defaultPath: defaultName,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      },
    });
  } catch { /* fall through */ }
  return prompt(`Save path (${defaultName}):`, defaultName);
}

type ExportMode = "full" | "date" | "period";

export function ExportControls() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<ExportMode>("full");
  const [format, setFormat] = useState<"fastcoin" | "xlsx" | "csv">("fastcoin");
  const [isExporting, setIsExporting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const addToast = useUIStore((s) => s.addToast);
  const selectedDate = useUIStore((s) => s.selectedDate);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const pwMismatch = confirmPassword && password !== confirmPassword;
  const pwTooShort = password.length > 0 && password.length < 8;

  const handleExport = async () => {
    if (format === "fastcoin") {
      if (!password) { addToast(t('settings.needPassword'), "error"); return; }
      if (password.length < 8) { addToast(t('settings.pwTooShort'), "error"); return; }
      if (password !== confirmPassword) { addToast(t('settings.pwMismatch'), "error"); return; }
    }
    setIsExporting(true);
    try {
      const ts = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
      const ext = format === "fastcoin" ? "fastcoin" : format === "xlsx" ? "xlsx" : "csv";
      const defaultName = mode === "date"
        ? `FastCoin_date_${selectedDate}_${ts}.${ext}`
        : `FastCoin_${mode}_${ts}.${ext}`;

      let filePath = await showSaveDialog(defaultName, ext);
      if (!filePath && manualPath) filePath = manualPath;
      if (!filePath) { setIsExporting(false); return; }

      if (isAndroid()) {
        // Content-based export: Rust generates data in memory, frontend writes to SAF URI.
        // Avoids the fs plugin scope issue on Android where $APPDATA resolves differently
        // from app.path().app_data_dir(), causing "forbidden path" for temp files.
        const base64 = await api.exportDataToBytes(
          password, mode, format, mode === "date" ? selectedDate : undefined,
        );
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        await writeFile(filePath, bytes);
      } else {
        await api.exportData(password, mode, format, filePath, mode === "date" ? selectedDate : undefined);
      }
      addToast(t('settings.exportSuccess'), "success");
      setPassword(""); setConfirmPassword("");
    } catch (e) {
      addToast(t('settings.exportFail', { error: String(e) }), "error");
    } finally { setIsExporting(false); }
  };

  const modeButtons: { key: ExportMode; label: string }[] = [
    { key: "full", label: t('settings.fullExport') },
    { key: "date", label: t('settings.dateExport') },
    { key: "period", label: t('settings.periodExport') },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('settings.export')}</h3>

      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.format')}</label>
        <div className="flex gap-2">
          {(["fastcoin", "xlsx", "csv"] as const).map((k) => (
            <button key={k} onClick={() => setFormat(k)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all
                ${format === k ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
            >
              {k === "fastcoin" ? t('settings.encrypted') : k === "xlsx" ? "Excel" : "CSV"}
            </button>
          ))}
        </div>
      </div>

      {format === "fastcoin" && (
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.mode')}</label>
          <div className="flex gap-2">
            {modeButtons.map(({ key, label }) => (
              <button key={key} onClick={() => setMode(key)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${mode === key ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                {label}
              </button>
            ))}
          </div>
          {mode === "date" && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('settings.dateExportHint', { date: selectedDate })}
            </p>
          )}
        </div>
      )}

      {format === "fastcoin" && (
        <div className="space-y-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400">{t('settings.password')}</label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
              placeholder={t('settings.passwordPlaceholder')} />
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

          {password && (
            <div>
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded ${i <= strength.score ? strength.color : "bg-gray-200"}`} />
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{strength.label}</span>
            </div>
          )}
          {pwTooShort && <p className="text-xs text-red-500">{t('settings.pwTooShort')}</p>}

          <div>
            <input type={showPw ? "text" : "password"} value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
              placeholder={t('settings.confirmPassword')} />
          </div>
          {pwMismatch && <p className="text-xs text-red-500">{t('settings.pwMismatch')}</p>}

          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{t('settings.securityTitle')}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{t('settings.securityDesc')}</p>
          </div>
        </div>
      )}

      {!isAndroid() && (
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.savePath')}</label>
          <input type="text" value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
            placeholder={t('settings.savePathPlaceholder')} />
        </div>
      )}

      <Button className="w-full" onClick={handleExport} isLoading={isExporting}>
        {t('settings.exportButton')}
      </Button>
    </div>
  );
}
