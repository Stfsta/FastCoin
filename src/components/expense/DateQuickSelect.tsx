import { formatDate, subDays } from "date-fns";

interface DateQuickSelectProps {
  value: string;
  onChange: (date: string) => void;
}

const quickOptions = [
  { label: "今天", getDate: () => formatDate(new Date(), "yyyy-MM-dd") },
  { label: "昨天", getDate: () => formatDate(subDays(new Date(), 1), "yyyy-MM-dd") },
  { label: "前天", getDate: () => formatDate(subDays(new Date(), 2), "yyyy-MM-dd") },
];

export function DateQuickSelect({ value, onChange }: DateQuickSelectProps) {
  const today = formatDate(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">日期</label>
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
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        />
      </div>
    </div>
  );
}
