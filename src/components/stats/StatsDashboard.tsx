import { useState, useEffect } from "react";
import { formatDate } from "date-fns";
import * as api from "@/lib/tauri";
import type { StatsResponse } from "@/lib/tauri";
import type { AccountingPeriod } from "@/types";
import { SpendingTrendChart } from "@/components/charts/SpendingTrendChart";
import { SourceDistribution } from "@/components/charts/SourceDistribution";
import { useDataStore } from "@/stores/dataStore";

export function StatsDashboard() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshKey = useDataStore((s) => s.refreshKey);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activePeriodId) {
      loadStats(activePeriodId);
    }
  }, [activePeriodId, refreshKey]);

  const loadData = async () => {
    try {
      const [p, settings] = await Promise.all([
        api.getPeriods(),
        api.getSettings(),
      ]);
      setPeriods(p);
      const activeId = settings.activePeriodId || p.find((x) => x.isActive)?.id || p[0]?.id;
      if (activeId) {
        setActivePeriodId(activeId);
      }
    } catch (e) {
      console.error("Failed to load data:", e);
      setIsLoading(false);
    }
  };

  const loadStats = async (periodId: string) => {
    setIsLoading(true);
    try {
      const s = await api.getStats(periodId);
      setStats(s);
    } catch (e) {
      console.error("Failed to load stats:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await api.setActivePeriod(id);
      setActivePeriodId(id);
    } catch (e) {
      console.error("Failed to set active period:", e);
    }
  };

  const today = formatDate(new Date(), "yyyy-MM-dd");

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">财务统计</h2>
          <p className="text-xs text-gray-500">{today}</p>
        </div>
        <select
          value={activePeriodId || ""}
          onChange={(e) => handleSetActive(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-100 border-0 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="周期总支出"
              value={`¥${(stats.periodTotal / 100).toFixed(2)}`}
              color="text-gray-900"
            />
            <StatCard
              label="今日支出"
              value={`¥${(stats.todayTotal / 100).toFixed(2)}`}
              color="text-primary-600"
            />
            <StatCard
              label="日均消费"
              value={`¥${(stats.dailyAverage / 100).toFixed(2)}`}
              color="text-amber-600"
            />
            <StatCard
              label="周期进度"
              value={`${stats.daysElapsed}/${stats.daysTotal}天`}
              color="text-emerald-600"
            />
          </div>

          {/* Per Source Breakdown */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">支付来源分布</h3>
            <div className="space-y-2">
              {stats.perSource.map((s) => {
                const pct = stats.periodTotal > 0
                  ? ((s.total / stats.periodTotal) * 100).toFixed(1)
                  : "0.0";
                return (
                  <div key={s.sourceId} className="flex items-center gap-2">
                    <span>{s.sourceIcon}</span>
                    <span className="text-sm text-gray-700 w-16 truncate">{s.sourceName}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: s.sourceColor,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-20 text-right">
                      ¥{(s.total / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts */}
          <SpendingTrendChart dailySeries={stats.dailySeries} />
          <SourceDistribution perSource={stats.perSource} />
        </>
      ) : (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500 text-sm">暂无统计数据</p>
          <p className="text-gray-400 text-xs mt-1">添加消费记录后查看统计</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
