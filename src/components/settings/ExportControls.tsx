import { useState } from "react";
import * as api from "@/lib/tauri";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/common/Button";

export function ExportControls() {
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"full" | "incremental">("full");
  const [format, setFormat] = useState<"fastcoin" | "xlsx" | "csv">("fastcoin");
  const [isExporting, setIsExporting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const handleExport = async () => {
    if (format === "fastcoin" && !password) {
      addToast("请输入加密密码", "error");
      return;
    }
    setIsExporting(true);
    try {
      // In a Tauri app, we'd use the dialog plugin for file save
      // For now, generate a default filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
      const ext = format === "fastcoin" ? "fastcoin" : format === "xlsx" ? "xlsx" : "csv";
      const defaultName = `FastCoin_${mode}_${timestamp}.${ext}`;

      // Use Tauri dialog to get save path
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const filePath = await save({
          defaultPath: defaultName,
          filters: [{
            name: format === "fastcoin" ? "FastCoin File" : format === "xlsx" ? "Excel" : "CSV",
            extensions: [ext],
          }],
        });
        if (!filePath) {
          setIsExporting(false);
          return;
        }
        await api.exportData(password, mode, format, filePath);
        addToast("导出成功", "success");
      } catch (_) {
        // Fallback: download via browser (dev mode)
        addToast("请在 Tauri 环境中运行以使用文件对话框", "info");
      }
    } catch (e) {
      addToast(`导出失败: ${e}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">导出数据</h3>

      {/* Format */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">导出格式</label>
        <div className="flex gap-2">
          {([
            { key: "fastcoin", label: "加密备份" },
            { key: "xlsx", label: "Excel" },
            { key: "csv", label: "CSV" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFormat(opt.key)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all
                ${format === opt.key
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode (only for fastcoin) */}
      {format === "fastcoin" && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">导出模式</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("full")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all
                ${mode === "full" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              完整导出
            </button>
            <button
              onClick={() => setMode("incremental")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all
                ${mode === "incremental" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              增量更新
            </button>
          </div>
        </div>
      )}

      {/* Password (only for fastcoin) */}
      {format === "fastcoin" && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">加密密码</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg"
              placeholder="设置密码保护数据"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          {mode === "incremental" && (
            <p className="text-xs text-gray-400 mt-1">
              增量导出仅包含上次导出后变更的数据
            </p>
          )}
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleExport}
        isLoading={isExporting}
      >
        导出
      </Button>
    </div>
  );
}
