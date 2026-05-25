import { useTranslation } from "react-i18next";
import { useUIStore, type MobilePanel } from "@/stores/uiStore";

export function MobileTabBar() {
  const { t } = useTranslation();
  const active = useUIStore((s) => s.activeMobilePanel);
  const setPanel = useUIStore((s) => s.setActiveMobilePanel);

  const tabs: { key: MobilePanel; label: string; icon: string }[] = [
    { key: "entry", label: t('tabs.entry'), icon: "✏️" },
    { key: "stats", label: t('tabs.stats'), icon: "📊" },
    { key: "settings", label: t('tabs.settings'), icon: "⚙️" },
  ];

  return (
    <nav
      className="flex border-t border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setPanel(tab.key)}
          className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
            active === tab.key
              ? "text-primary-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <span className="text-xl mb-0.5">{tab.icon}</span>
          <span className="font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
