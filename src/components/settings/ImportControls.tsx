import { useState } from "react";
import * as api from "@/lib/tauri";
import type { ImportDiff, MergeStrategy } from "@/types";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/common/Button";

export function ImportControls() {
  const [password, setPassword] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [diff, setDiff] = useState<ImportDiff | null>(null);
  const [filePath, setFilePath] = useState("");
  const addToast = useUIStore((s) => s.addToast);

  const handleSelectFile = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        filters: [{
          name: "FastCoin File",
          extensions: ["fastcoin", "json"],
        }],
        multiple: false,
      });
      if (selected) {
        setFilePath(selected as string);
        setDiff(null);
      }
    } catch (_) {
      addToast("请在 Tauri 环境中运行", "info");
    }
  };

  const handlePreview = async () => {
    if (!filePath || !password) {
      addToast("请选择文件并输入密码", "error");
      return;
    }
    setIsImporting(true);
    try {
      const result = await api.importPreview(filePath, password);
      setDiff(result);
    } catch (e) {
      addToast(`预览失败（密码错误或文件损坏）: ${e}`, "error");
      setDiff(null);
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirm = async (strategy: MergeStrategy) => {
    if (!filePath || !password) return;
    setIsImporting(true);
    try {
      await api.importConfirm(filePath, password, strategy);
      addToast("导入成功", "success");
      setDiff(null);
      setFilePath("");
      setPassword("");
    } catch (e) {
      addToast(`导入失败: ${e}`, "error");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700">导入数据</h3>

      <Button variant="secondary" size="sm" onClick={handleSelectFile}>
        {filePath ? `已选择: ${filePath.split(/[/\\]/).pop()}` : "选择文件"}
      </Button>

      <div>
        <label className="block text-xs text-gray-500 mb-1">解密密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          placeholder="输入导出时设定的密码"
        />
      </div>

      <Button
        variant="secondary"
        className="w-full"
        onClick={handlePreview}
        isLoading={isImporting}
      >
        预览导入
      </Button>

      {/* Diff Preview */}
      {diff && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">导入预览</h4>
          <DiffRow label="消费记录" counts={diff.expenses} />
          <DiffRow label="支付来源" counts={diff.paymentSources} />
          <DiffRow label="分类" counts={diff.categories} />
          <DiffRow label="记账周期" counts={diff.accountingPeriods} />

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => handleConfirm("import_newer")}
              isLoading={isImporting}
            >
              合并（保留最新）
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleConfirm("import_all")}
              isLoading={isImporting}
            >
              覆盖全部
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffRow({ label, counts }: { label: string; counts: { new: number; updated: number; unchanged: number } }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="flex gap-2 text-xs">
        {counts.new > 0 && (
          <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+{counts.new} 新增</span>
        )}
        {counts.updated > 0 && (
          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">~{counts.updated} 更新</span>
        )}
        {counts.unchanged > 0 && (
          <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{counts.unchanged} 不变</span>
        )}
        {counts.new === 0 && counts.updated === 0 && counts.unchanged === 0 && (
          <span className="text-gray-400">无数据</span>
        )}
      </div>
    </div>
  );
}
