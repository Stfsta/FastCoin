import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SourceManager } from "./SourceManager";
import { CategoryManager } from "./CategoryManager";
import { PeriodManager } from "./PeriodManager";
import { ExportControls } from "./ExportControls";
import { ImportControls } from "./ImportControls";
import { GeneralSettings } from "./GeneralSettings";

type SettingsTab = "bookkeeping" | "export" | "general";

export function SettingsPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("bookkeeping");

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "bookkeeping", label: t('settings.bookkeeping') },
    { key: "export", label: t('settings.importExport') },
    { key: "general", label: t('settings.general') },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h2>
      </div>

      <div className="flex border-b border-gray-100 px-2 overflow-x-auto scrollbar-thin dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0
              ${activeTab === tab.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {activeTab === "bookkeeping" && (
          <div className="space-y-6">
            <SourceManager />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <CategoryManager />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <PeriodManager />
          </div>
        )}
        {activeTab === "export" && (
          <div className="space-y-6">
            <ExportControls />
            <ImportControls />
          </div>
        )}
        {activeTab === "general" && <GeneralSettings />}
      </div>
    </div>
  );
}
