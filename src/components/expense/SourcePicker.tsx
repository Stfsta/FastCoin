import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { PaymentSource } from "@/types";
import * as api from "@/lib/tauri";
import { useDataStore } from "@/stores/dataStore";


interface SourcePickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SourcePicker({ selectedId, onSelect }: SourcePickerProps) {
  const { t } = useTranslation();
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshKey = useDataStore((s) => s.refreshKey);

  useEffect(() => {
    loadSources();
  }, [refreshKey]);

  const loadSources = async () => {
    try {
      const data = await api.getPaymentSources();
      setSources(data.filter((s) => s.isActive));
    } catch (e) {
      console.error("Failed to load payment sources:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto py-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-20 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('expense.source')}</label>
      <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">
        {sources.map((src) => (
          <button
            key={src.id}
            type="button"
            onClick={() => onSelect(src.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium
              shrink-0 transition-all border-2
              ${
                selectedId === src.id
                  ? "border-current shadow-sm"
                  : "border-transparent bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            style={
              selectedId === src.id
                ? { color: src.color, backgroundColor: `${src.color}18`, borderColor: `${src.color}40` }
                : undefined
            }
          >
            <span>{src.icon}</span>
            <span>{src.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
