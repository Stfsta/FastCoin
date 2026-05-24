import { useEffect } from "react";
import { useExpenseStore } from "@/stores/expenseStore";
import { ExpenseRow } from "./ExpenseRow";
import { formatDate } from "date-fns";

export function ExpenseList() {
  const expenses = useExpenseStore((s) => s.expenses);
  const isLoading = useExpenseStore((s) => s.isLoading);
  const fetchExpenses = useExpenseStore((s) => s.fetchExpenses);

  useEffect(() => {
    const today = formatDate(new Date(), "yyyy-MM-dd");
    // Fetch last 7 days of expenses
    const sevenDaysAgo = formatDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd",
    );
    fetchExpenses(sevenDaysAgo, today);
  }, [fetchExpenses]);

  // Group expenses by date
  const grouped = expenses.reduce<Record<string, typeof expenses>>(
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
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-gray-500 text-sm">还没有消费记录</p>
        <p className="text-gray-400 text-xs mt-1">添加你的第一笔消费吧</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-2 sticky top-0 bg-white py-2">
        最近记录
      </h3>
      {Object.entries(grouped).map(([date, items]) => {
        const total = items.reduce((sum, e) => sum + e.amount, 0);
        return (
          <div key={date} className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{date}</span>
              <span className="text-xs text-gray-400">
                ¥{(total / 100).toFixed(2)}
              </span>
            </div>
            <div className="space-y-1">
              {items.map((exp) => (
                <ExpenseRow key={exp.id} expense={exp} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
