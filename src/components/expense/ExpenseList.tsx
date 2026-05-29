import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useExpenseStore } from "@/stores/expenseStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDataStore } from "@/stores/dataStore";
import { ExpenseRow } from "./ExpenseRow";
import { formatAmount } from "@/utils/format";
import { formatDate } from "date-fns";
import type { PaymentSource, Category } from "@/types";
import * as api from "@/lib/tauri";

export function ExpenseList() {
  const { t } = useTranslation();
  const expenses = useExpenseStore((s) => s.expenses);
  const isLoading = useExpenseStore((s) => s.isLoading);
  const fetchExpenses = useExpenseStore((s) => s.fetchExpenses);
  const refreshKey = useDataStore((s) => s.refreshKey);
  void useSettingsStore((s) => s.settings?.defaultCurrency); // reactive subscription for currency changes

  // Filter state
  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.getPaymentSources().then(setSources).catch(() => {});
    api.getCategories().then(setCategories).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    const today = formatDate(new Date(), "yyyy-MM-dd");
    // Fetch last 7 days of expenses
    const sevenDaysAgo = formatDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd",
    );
    fetchExpenses(sevenDaysAgo, today);
  }, [fetchExpenses, refreshKey]);

  // Filtered data
  const filteredExpenses = useMemo(() => {
    let result = expenses;

    if (filterDate) {
      result = result.filter((e) => e.date === filterDate);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((e) => {
        if (e.note.toLowerCase().includes(q)) return true;
        const src = sources.find((s) => s.id === e.sourceId);
        if (src?.name.toLowerCase().includes(q)) return true;
        if (e.categoryId) {
          const cat = categories.find((c) => c.id === e.categoryId);
          if (cat?.name.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    return result;
  }, [expenses, filterDate, searchText, sources, categories]);

  // Group expenses by date
  const grouped = filteredExpenses.reduce<Record<string, typeof filteredExpenses>>(
    (acc, exp) => {
      if (!acc[exp.date]) acc[exp.date] = [];
      acc[exp.date].push(exp);
      return acc;
    },
    {},
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('expense.noRecords')}</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t('expense.noRecordsHint')}</p>
      </div>
    );
  }

  const groupedEntries = Object.entries(grouped);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
        {t('expense.recentRecords')}
      </h3>

      {/* Filter bar */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t('expense.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:bg-gray-700 dark:border-gray-600 min-h-[44px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
            {t('expense.filterByDate')}
          </label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            max={formatDate(new Date(), "yyyy-MM-dd")}
            className="px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 min-h-[44px]"
          />
          {filterDate && (
            <button
              type="button"
              onClick={() => setFilterDate("")}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline min-h-[44px] inline-flex items-center shrink-0"
            >
              {t('expense.clearFilter')}
            </button>
          )}
        </div>
      </div>

      {/* No match empty state */}
      {groupedEntries.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('expense.noMatch')}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t('expense.noMatchHint')}</p>
        </div>
      ) : (
        groupedEntries.map(([date, items]) => {
          const total = items.reduce((sum, e) => sum + e.amount, 0);
          return (
            <div key={date} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 dark:text-gray-500">{date}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatAmount(total)}
                </span>
              </div>
              <div className="space-y-1">
                {items.map((exp) => (
                  <ExpenseRow key={exp.id} expense={exp} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
