import { useState, useEffect } from "react";
import type { PaymentSource } from "@/types";
import * as api from "@/lib/tauri";
import { useUIStore } from "@/stores/uiStore";

interface SourcePickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SourcePicker({ selectedId, onSelect }: SourcePickerProps) {
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSources();
  }, []);

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
          <div key={i} className="h-10 w-20 bg-gray-100 rounded-full animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">支付来源</label>
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
                  : "border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200"
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
