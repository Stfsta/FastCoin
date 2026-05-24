import { useUIStore, type MobilePanel } from "@/stores/uiStore";

const tabs: { key: MobilePanel; label: string; icon: string }[] = [
  { key: "entry", label: "记账", icon: "✏️" },
  { key: "stats", label: "统计", icon: "📊" },
  { key: "settings", label: "设置", icon: "⚙️" },
];

export function MobileTabBar() {
  const active = useUIStore((s) => s.activeMobilePanel);
  const setPanel = useUIStore((s) => s.setActiveMobilePanel);

  return (
    <nav
      className="flex border-t border-gray-200 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setPanel(tab.key)}
          className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
            active === tab.key
              ? "text-primary-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="text-xl mb-0.5">{tab.icon}</span>
          <span className="font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
