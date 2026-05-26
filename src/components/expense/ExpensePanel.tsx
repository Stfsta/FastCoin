import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useUIStore } from "@/stores/uiStore";
import { isMobile } from "@/lib/platform";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseList } from "./ExpenseList";

export function ExpensePanel() {
  const { t } = useTranslation();
  const leftFormFraction = useUIStore((s) => s.leftFormFraction);
  const setLeftFormFraction = useUIStore((s) => s.setLeftFormFraction);
  const [mobileTab, setMobileTab] = useState<"form" | "list">("form");
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onVerticalDrag = useCallback((delta: number) => {
    const el = panelRef.current;
    if (!el) return;
    const totalH = el.getBoundingClientRect().height;
    const newFrac = leftFormFraction + delta / totalH;
    setLeftFormFraction(newFrac);
  }, [leftFormFraction, setLeftFormFraction]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startY = e.clientY;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      onVerticalDrag(ev.clientY - startY);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [onVerticalDrag]);

  // Mobile: toggle between form and list
  if (isMobile()) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100 shrink-0 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('app.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('app.subtitle')}</p>
        </div>

        {/* Mobile tab switcher */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0">
          <button
            onClick={() => setMobileTab("form")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
              mobileTab === "form"
                ? "text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t('expense.newEntry')}
          </button>
          <button
            onClick={() => setMobileTab("list")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
              mobileTab === "list"
                ? "text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t('expense.recentRecords')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mobileTab === "form" ? <ExpenseForm /> : <ExpenseList />}
        </div>
      </div>
    );
  }

  // Desktop: drag-split layout
  return (
    <div ref={panelRef} className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 shrink-0 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('app.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('app.subtitle')}</p>
      </div>

      {/* Form area */}
      <div
        className="overflow-y-auto scrollbar-thin shrink-0"
        style={{ height: `${leftFormFraction * 100}%`, maxHeight: `${leftFormFraction * 100}%` }}
      >
        <ExpenseForm />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="h-1.5 bg-gray-100 hover:bg-primary-300 cursor-row-resize shrink-0 transition-colors flex items-center justify-center group dark:bg-gray-700"
      >
        <div className="w-8 h-0.5 rounded bg-gray-300 group-hover:bg-primary-500 dark:bg-gray-500" />
      </div>

      {/* Recent records area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ExpenseList />
      </div>
    </div>
  );
}
