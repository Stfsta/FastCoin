import { useState, useEffect } from "react";
import type { AccountingPeriod } from "@/types";
import * as api from "@/lib/tauri";
import { useUIStore } from "@/stores/uiStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { formatDate } from "date-fns";

export function PeriodManager() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState(formatDate(new Date(), "yyyy-MM-dd"));
  const [formEnd, setFormEnd] = useState("");

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      const data = await api.getPeriods();
      setPeriods(data);
    } catch (e) {
      addToast("加载周期失败", "error");
    }
  };

  const handleAdd = async () => {
    if (!formName.trim() || !formStart || !formEnd) {
      addToast("请填写完整信息", "error");
      return;
    }
    if (formStart >= formEnd) {
      addToast("开始日期必须早于结束日期", "error");
      return;
    }
    try {
      await api.addPeriod({
        name: formName.trim(),
        startDate: formStart,
        endDate: formEnd,
      });
      addToast("添加成功", "success");
      setShowAdd(false);
      loadPeriods();
    } catch (e) {
      addToast(`添加失败: ${e}`, "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePeriod(id);
      addToast("已删除", "success");
      loadPeriods();
    } catch (e) {
      addToast(`删除失败: ${e}`, "error");
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await api.setActivePeriod(id);
      addToast("已切换当前周期", "success");
      loadPeriods();
    } catch (e) {
      addToast(`切换失败: ${e}`, "error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">管理记账周期</h3>
        <Button size="sm" onClick={() => { setFormName(""); setFormEnd(""); setShowAdd(true); }}>
          + 添加
        </Button>
      </div>

      <div className="space-y-1">
        {periods.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
              p.isActive ? "bg-primary-50 border-primary-200" : "bg-gray-50 border-gray-100"
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{p.name}</p>
              <p className="text-xs text-gray-500">
                {p.startDate} ~ {p.endDate}
              </p>
            </div>
            {p.isActive ? (
              <span className="text-xs text-primary-600 font-medium bg-primary-100 px-2 py-0.5 rounded">
                当前
              </span>
            ) : (
              <button
                onClick={() => handleSetActive(p.id)}
                className="text-xs text-primary-600 hover:underline"
              >
                设为当前
              </button>
            )}
            <button
              onClick={() => handleDelete(p.id)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="添加记账周期"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">周期名称</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="如: 5月消费周期"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">开始日期</label>
              <input
                type="date"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">结束日期</label>
              <input
                type="date"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleAdd}>添加</Button>
        </div>
      </Modal>
    </div>
  );
}
