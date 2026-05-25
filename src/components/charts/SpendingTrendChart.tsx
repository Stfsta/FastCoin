import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";
import { formatAmount } from "@/utils/format";

interface DailyTotal {
  date: string;
  total: number;
}

interface SpendingTrendChartProps {
  dailySeries: DailyTotal[];
}

export function SpendingTrendChart({ dailySeries }: SpendingTrendChartProps) {
  const { t } = useTranslation();

  if (dailySeries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 text-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">{t('stats.noData')}</p>
      </div>
    );
  }

  const data = dailySeries.map((d) => ({
    ...d,
    totalYuan: d.total / 100,
    label: d.date.slice(5),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('stats.trend')}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" tickFormatter={(v) => formatAmount(v * 100)} />
          <Tooltip
            formatter={(value: number) => [formatAmount(value * 100), t('stats.periodTotal')]}
            labelFormatter={(label) => `${t('expense.date')}: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="totalYuan"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#colorAmount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
