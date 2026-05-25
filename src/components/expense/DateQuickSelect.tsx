import { formatDate, subDays } from "date-fns";
import { useTranslation } from "react-i18next";

interface DateQuickSelectProps {
  value: string;
  onChange: (date: string) => void;
}

export function DateQuickSelect({ value, onChange }: DateQuickSelectProps) {
  const { t } = useTranslation();
  const today = formatDate(new Date(), "yyyy-MM-dd");

  const quickOptions = [
    { label: t('expense.today'), getDate: () => formatDate(new Date(), "yyyy-MM-dd") },
    { label: t('expense.yesterday'), getDate: () => formatDate(subDays(new Date(), 1), "yyyy-MM-dd") },
    { label: t('expense.dayBefore'), getDate: () => formatDate(subDays(new Date(), 2), "yyyy-MM-dd") },
  ];

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {t('expense.date')}
      </label>
      <div className="flex items-center gap-2">
        {quickOptions.map((opt) => {
          const d = opt.getDate();
          const isActive = value === d;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
            >
              {opt.label}
            </button>
          );
        })}
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          max={today}
          className="ml-auto px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
            dark:bg-gray-700 dark:border-gray-600"
        />
      </div>
    </div>
  );
}
