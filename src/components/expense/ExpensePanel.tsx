import { useCallback, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseList } from "./ExpenseList";

export function ExpensePanel() {
  const leftFormFraction = useUIStore((s) => s.leftFormFraction);
  const setLeftFormFraction = useUIStore((s) => s.setLeftFormFraction);
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

  return (
    <div ref={panelRef} className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">FastCoin</h1>
        <p className="text-sm text-gray-500">快捷记账</p>
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
        className="h-1.5 bg-gray-100 hover:bg-primary-300 cursor-row-resize shrink-0 transition-colors flex items-center justify-center group"
      >
        <div className="w-8 h-0.5 rounded bg-gray-300 group-hover:bg-primary-500" />
      </div>

      {/* Recent records area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ExpenseList />
      </div>
    </div>
  );
}
