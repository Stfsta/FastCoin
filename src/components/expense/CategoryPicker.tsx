import { useState, useEffect } from "react";
import type { Category } from "@/types";
import * as api from "@/lib/tauri";

interface CategoryPickerProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryPicker({ selectedId, onSelect }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.getCategories().then((data) => setCategories(data.filter((c) => c.isActive)));
  }, []);

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">分类（可选）</label>
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
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
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
