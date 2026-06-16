import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import type { Expense, PaymentSource, Category } from "@/types";
import { useExpenseStore } from "@/stores/expenseStore";
import { useUIStore } from "@/stores/uiStore";
import { formatAmount } from "@/utils/format";

interface ExpenseRowProps {
  expense: Expense;
  sourceMap: Map<string, PaymentSource>;
  categoryMap: Map<string, Category>;
}

export function ExpenseRow({ expense, sourceMap, categoryMap }: ExpenseRowProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const addToast = useUIStore((s) => s.addToast);

  const source = sourceMap.get(expense.sourceId);
  const category = expense.categoryId ? categoryMap.get(expense.categoryId) : undefined;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteExpense(expense.id);
      addToast(i18n.t("expense.deleted"), "success");
    } catch (e) {
      addToast(i18n.t("expense.deleteFail", { error: String(e) }), "error");
      setIsDeleting(false);
    }
  };

  const sourceTypeLabels: Record<string, string> = {
    wechat: "微信",
    alipay: "支付宝",
    bank_card: "银行卡",
    cash: "现金",
    other: "其他",
  };

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`flex flex-col px-3 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700
        transition-all cursor-pointer ${isDeleting ? "opacity-50 scale-95" : ""} ${isExpanded ? "ring-1 ring-primary-200 dark:ring-primary-800" : ""}`}
    >
      <div className="flex items-center gap-3">
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
                {category?.icon || "📂"}
              </span>
            )}
          </div>
          {expense.note && !isExpanded && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{expense.note}</p>
          )}
        </div>

        {/* Chevron indicator */}
        <svg
          className={`w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

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

      {/* Expanded details */}
      {isExpanded && (
        <div className="pl-11 pt-2 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
          {source && (
            <p>
              <span className="text-gray-400 dark:text-gray-500">{t('expense.paymentSource')}：</span>
              {source.icon} {source.name}
              {source.type && <span className="text-gray-400 dark:text-gray-500 ml-1">({sourceTypeLabels[source.type] || source.type})</span>}
            </p>
          )}
          {category && (
            <p>
              <span className="text-gray-400 dark:text-gray-500">{t('expense.category')}：</span>
              {category.icon} {category.name}
            </p>
          )}
          <p>
            <span className="text-gray-400 dark:text-gray-500">{t('expense.expenseDate')}：</span>
            {expense.date}
          </p>
          {expense.note && (
            <p>
              <span className="text-gray-400 dark:text-gray-500">{t('expense.note')}：</span>
              <span className="whitespace-normal">{expense.note}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
