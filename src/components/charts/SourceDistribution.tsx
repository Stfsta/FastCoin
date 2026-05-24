import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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
      <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
        <p className="text-gray-400 text-sm">暂无来源分布数据</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">来源分布</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`¥${value.toFixed(2)}`, ""]} />
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
