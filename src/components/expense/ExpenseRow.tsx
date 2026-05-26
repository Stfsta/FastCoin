import { useState, useEffect } from "react";
import i18n from "@/i18n";
import type { Expense, PaymentSource } from "@/types";
import { useExpenseStore } from "@/stores/expenseStore";
import { useUIStore } from "@/stores/uiStore";
import { formatAmount } from "@/utils/format";
import * as api from "@/lib/tauri";

interface ExpenseRowProps {
  expense: Expense;
}

export function ExpenseRow({ expense }: ExpenseRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    api.getPaymentSources().then(setSources).catch(() => {});
  }, []);

  const source = sources.find((s) => s.id === expense.sourceId);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(expense.id);
      addToast(i18n.t("expense.deleted"), "success");
    } catch (e) {
      addToast(i18n.t("expense.deleteFail", { error: String(e) }), "error");
      setIsDeleting(false);
    }
  };


  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700
        transition-all ${isDeleting ? "opacity-50 scale-95" : ""}`}
    >
      {/* Source icon */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: source?.color ? `${source.color}28` : "#f3f4f6" }}
      >
        {source?.icon || "💳"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">-{formatAmount(expense.amount)}</span>
          {expense.categoryId && (
            <span className="text-2xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
              🍔
            </span>
          )}
        </div>
        {expense.note && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{expense.note}</p>
        )}
      </div>

      <button
        onClick={handleDelete}
        className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30
          transition-colors shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
