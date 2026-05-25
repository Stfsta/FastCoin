import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { PaymentSource } from "@/types";
import * as api from "@/lib/tauri";
import { useUIStore } from "@/stores/uiStore";
import { useDataStore } from "@/stores/dataStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";

const PRESET_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

export function SourceManager() {
  const { t } = useTranslation();
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [editingSource, setEditingSource] = useState<PaymentSource | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("other");
  const [formIcon, setFormIcon] = useState("💳");
  const [formColor, setFormColor] = useState("#3B82F6");

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      const data = await api.getPaymentSources();
      setSources(data);
    } catch (e) {
      addToast(t('settings.loadSourcesFail'), "error");
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormType("other");
    setFormIcon("💳");
    setFormColor("#3B82F6");
  };

  const handleAdd = async () => {
    if (!formName.trim()) {
      addToast(t('settings.needName'), "error");
      return;
    }
    try {
      await api.addPaymentSource({
        name: formName.trim(),
        sourceType: formType,
        icon: formIcon,
        color: formColor,
      });
      useDataStore.getState().triggerRefresh();
      addToast(t('settings.addSuccess'), "success");
      setShowAdd(false);
      resetForm();
      loadSources();
    } catch (e) {
      addToast(t('settings.addFail', { error: String(e) }), "error");
    }
  };

  const handleEdit = async () => {
    if (!editingSource || !formName.trim()) return;
    try {
      await api.updatePaymentSource({
        id: editingSource.id,
        name: formName.trim(),
        sourceType: formType,
        icon: formIcon,
        color: formColor,
      });
      useDataStore.getState().triggerRefresh();
      addToast(t('settings.editSuccess'), "success");
      setEditingSource(null);
      loadSources();
    } catch (e) {
      addToast(t('settings.editFail', { error: String(e) }), "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePaymentSource(id);
      useDataStore.getState().triggerRefresh();
      addToast(t('settings.deleted'), "success");
      loadSources();
    } catch (e) {
      addToast(t('settings.deleteFail', { error: String(e) }), "error");
    }
  };

  const openEdit = (src: PaymentSource) => {
    setEditingSource(src);
    setFormName(src.name);
    setFormType(src.type);
    setFormIcon(src.icon);
    setFormColor(src.color);
  };

  const typeLabel = (tp: string) => {
    const map: Record<string, string> = {
      bank_card: t('settings.bankCard'),
      alipay: t('settings.alipay'),
      wechat: t('settings.wechat'),
      cash: t('settings.cash'),
      other: t('settings.other'),
    };
    return map[tp] || tp;
  };

  const typeOptions = ["bank_card", "alipay", "wechat", "cash", "other"] as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('settings.sources')}</h3>
        <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}>
          + {t('settings.add')}
        </Button>
      </div>

      <div className="space-y-1">
        {sources
          .filter((s) => s.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((src) => (
            <div
              key={src.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: src.color }}
              />
              <span className="text-lg">{src.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{src.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{typeLabel(src.type)}</p>
              </div>
              <button
                onClick={() => openEdit(src)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-primary-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(src.id)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500"
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
        isOpen={showAdd || !!editingSource}
        onClose={() => { setShowAdd(false); setEditingSource(null); }}
        title={editingSource ? t('settings.editSource') : t('settings.addSource')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.name')}</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder={t('settings.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.type')}</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
            >
              {typeOptions.map((k) => (
                <option key={k} value={k}>{typeLabel(k)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.icon')}</label>
            <input
              type="text"
              value={formIcon}
              onChange={(e) => setFormIcon(e.target.value.slice(0, 2))}
              className="w-full px-3 py-2 text-lg text-center border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.color')}</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFormColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    formColor === c ? "ring-2 ring-offset-2 ring-primary-500 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            onClick={editingSource ? handleEdit : handleAdd}
          >
            {editingSource ? t('settings.save') : t('settings.add')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
