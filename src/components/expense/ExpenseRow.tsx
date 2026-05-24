import { useState } from "react";
import type { Expense } from "@/types";
import { useExpenseStore } from "@/stores/expenseStore";
import { useUIStore } from "@/stores/uiStore";

interface ExpenseRowProps {
  expense: Expense;
}

export function ExpenseRow({ expense }: ExpenseRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const addToast = useUIStore((s) => s.addToast);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(expense.id);
      addToast("已删除", "success");
    } catch (e) {
      addToast(`删除失败: ${e}`, "error");
      setIsDeleting(false);
    }
  };

  const amountYuan = (expense.amount / 100).toFixed(2);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-gray-100
        transition-all ${isDeleting ? "opacity-50 scale-95" : ""}`}
    >
      {/* Source icon */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: "#f3f4f6" }}
      >
        💬
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">-¥{amountYuan}</span>
          {expense.categoryId && (
            <span className="text-2xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
              🍔
            </span>
          )}
        </div>
        {expense.note && (
          <p className="text-xs text-gray-400 truncate">{expense.note}</p>
        )}
      </div>

      <button
        onClick={handleDelete}
        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50
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
