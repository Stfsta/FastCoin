import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AccountingPeriod } from "@/types";
import * as api from "@/lib/tauri";
import { useUIStore } from "@/stores/uiStore";
import { useDataStore } from "@/stores/dataStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { formatDate } from "date-fns";

export function PeriodManager() {
  const { t } = useTranslation();
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState(formatDate(new Date(), "yyyy-MM-dd"));
  const [formEnd, setFormEnd] = useState("");

  const refreshKey = useDataStore((s) => s.refreshKey);

  useEffect(() => {
    loadPeriods();
  }, [refreshKey]);

  const loadPeriods = async () => {
    try {
      const data = await api.getPeriods();
      setPeriods(data);
    } catch (e) {
      addToast(t('settings.loadPeriodsFail'), "error");
    }
  };

  const handleAdd = async () => {
    if (!formName.trim() || !formStart || !formEnd) {
      addToast(t('settings.needPeriodInfo'), "error");
      return;
    }
    if (formStart >= formEnd) {
      addToast(t('settings.startBeforeEnd'), "error");
      return;
    }
    try {
      await api.addPeriod({
        name: formName.trim(),
        startDate: formStart,
        endDate: formEnd,
      });
      useDataStore.getState().triggerRefresh();
      addToast(t('settings.addSuccess'), "success");
      setShowAdd(false);
      loadPeriods();
    } catch (e) {
      addToast(t('settings.addFail', { error: String(e) }), "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePeriod(id);
      useDataStore.getState().triggerRefresh();
      addToast(t('settings.deleted'), "success");
      loadPeriods();
    } catch (e) {
      addToast(t('settings.deleteFail', { error: String(e) }), "error");
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await api.setActivePeriod(id);
      useDataStore.getState().triggerRefresh();
      addToast(t('settings.periodSwitched'), "success");
      loadPeriods();
    } catch (e) {
      addToast(t('settings.switchFail', { error: String(e) }), "error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('settings.periods')}</h3>
        <Button size="sm" onClick={() => { setFormName(""); setFormEnd(""); setShowAdd(true); }}>
          + {t('settings.add')}
        </Button>
      </div>

      <div className="space-y-1">
        {periods.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
              p.isActive
                ? "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
                : "bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600"
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {p.startDate} ~ {p.endDate}
              </p>
            </div>
            {p.isActive ? (
              <span className="text-xs text-primary-600 font-medium bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                {t('settings.current')}
              </span>
            ) : (
              <button
                onClick={() => handleSetActive(p.id)}
                className="text-xs text-primary-600 hover:underline"
              >
                {t('settings.setAsCurrent')}
              </button>
            )}
            <button
              onClick={() => handleDelete(p.id)}
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500"
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
        title={t('settings.addPeriod')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.periodName')}</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
              placeholder={t('settings.periodNamePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.startDate')}</label>
              <input
                type="date"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">{t('settings.endDate')}</label>
              <input
                type="date"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg"
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleAdd}>{t('settings.add')}</Button>
        </div>
      </Modal>
    </div>
  );
}
