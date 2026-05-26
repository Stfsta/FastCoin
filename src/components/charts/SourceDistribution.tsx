import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { formatAmount } from "@/utils/format";
import { isMobile } from "@/lib/platform";

interface SourceTotal {
  sourceId: string;
  sourceName: string;
  sourceIcon: string;
  sourceColor: string;
  total: number;
}

interface SourceDistributionProps {
  perSource: SourceTotal[];
}

export function SourceDistribution({ perSource }: SourceDistributionProps) {
  const { t } = useTranslation();

  const data = perSource
    .filter((s) => s.total > 0)
    .map((s) => ({
      name: s.sourceName,
      value: s.total / 100,
      color: s.sourceColor,
      icon: s.sourceIcon,
    }));

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 text-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">{t('stats.noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('stats.sourceDist')}</h3>
      <ResponsiveContainer width="100%" height={isMobile() ? 180 : 220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={isMobile() ? 38 : 50}
            outerRadius={isMobile() ? 65 : 80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [formatAmount(value * 100), ""]} />
          <Legend
            formatter={(value: string) => {
              const d = data.find((x) => x.name === value);
              return `${d?.icon || ""} ${value}`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
