import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "@/types";
import * as api from "@/lib/tauri";
import { useDataStore } from "@/stores/dataStore";

interface CategoryPickerProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryPicker({ selectedId, onSelect }: CategoryPickerProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const refreshKey = useDataStore((s) => s.refreshKey);

  useEffect(() => {
    api.getCategories().then((data) => setCategories(data.filter((c) => c.isActive)));
  }, [refreshKey]);

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('expense.categoryOptional')}</label>
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(selectedId === cat.id ? null : cat.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
              transition-all border
              ${selectedId === cat.id
                ? "text-white shadow-sm border-transparent"
                : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
            style={
              selectedId === cat.id
                ? { backgroundColor: cat.color }
                : undefined
            }
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
