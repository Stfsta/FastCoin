import { useState } from "react";
import { SourceManager } from "./SourceManager";
import { CategoryManager } from "./CategoryManager";
import { PeriodManager } from "./PeriodManager";
import { ExportControls } from "./ExportControls";
import { ImportControls } from "./ImportControls";
import { GeneralSettings } from "./GeneralSettings";

type SettingsTab = "sources" | "categories" | "periods" | "export" | "general";

const tabs: { key: SettingsTab; label: string }[] = [
  { key: "sources", label: "支付来源" },
  { key: "categories", label: "消费分类" },
  { key: "periods", label: "记账周期" },
  { key: "export", label: "导入导出" },
  { key: "general", label: "通用设置" },
];

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("sources");

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">设置</h2>
      </div>

      <div className="flex border-b border-gray-100 px-2 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0
              ${activeTab === tab.key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {activeTab === "sources" && <SourceManager />}
        {activeTab === "categories" && <CategoryManager />}
        {activeTab === "periods" && <PeriodManager />}
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
