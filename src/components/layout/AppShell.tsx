import { useCallback, useEffect, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";
import { MobileTabBar } from "./MobileTabBar";
import { Toast } from "@/components/common/Toast";
import { ExpensePanel } from "@/components/expense/ExpensePanel";
import { StatsDashboard } from "@/components/stats/StatsDashboard";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { isMobile } from "@/lib/platform";

function ResizeHandle({ onDrag, vertical = false }: { onDrag: (delta: number) => void; vertical?: boolean }) {
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startPos = vertical ? e.clientY : e.clientX;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = vertical ? ev.clientY - startPos : ev.clientX - startPos;
      onDrag(delta);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = vertical ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [onDrag, vertical]);

  return (
    <div
      onMouseDown={onMouseDown}
      className={
        vertical
          ? "h-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-primary-300 cursor-row-resize shrink-0 transition-colors flex items-center justify-center group"
          : "w-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-primary-300 cursor-col-resize shrink-0 transition-colors flex items-center justify-center group"
      }
    >
      <div className={vertical ? "w-8 h-0.5 rounded bg-gray-300 group-hover:bg-primary-500" : "w-0.5 h-8 rounded bg-gray-300 group-hover:bg-primary-500"} />
    </div>
  );
}

export function AppShell() {
  const activeMobilePanel = useUIStore((s) => s.activeMobilePanel);
  const leftWidth = useUIStore((s) => s.leftWidth);
  const rightWidth = useUIStore((s) => s.rightWidth);
  const setLeftWidth = useUIStore((s) => s.setLeftWidth);
  const setRightWidth = useUIStore((s) => s.setRightWidth);

  const containerRef = useRef<HTMLDivElement>(null);

  const onLeftDrag = useCallback((delta: number) => {
    const el = containerRef.current;
    if (!el) return;
    const totalW = el.getBoundingClientRect().width;
    const newFrac = leftWidth + delta / totalW;
    setLeftWidth(newFrac);
  }, [leftWidth, setLeftWidth]);

  const onRightDrag = useCallback((delta: number) => {
    const el = containerRef.current;
    if (!el) return;
    const totalW = el.getBoundingClientRect().width;
    const newFrac = rightWidth - delta / totalW;
    setRightWidth(newFrac);
  }, [rightWidth, setRightWidth]);

  const centerWidth = 1 - leftWidth - rightWidth;

  // Android back button: intercept popstate to navigate panel history
  useEffect(() => {
    if (!isMobile()) return;
    window.history.pushState(null, "");
    const handlePopState = () => {
      if (!useUIStore.getState().goBack()) {
        window.history.back();
      } else {
        window.history.pushState(null, "");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900" style={{ height: "100dvh" }}>
      {/* Desktop 3-column layout */}
      <div
        ref={containerRef}
        className="hidden lg:flex h-full overflow-hidden"
      >
        {/* Left: Expense Entry */}
        <aside
          className="h-full overflow-hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-600"
          style={{ width: `${leftWidth * 100}%`, minWidth: `${0.12 * 100}%` }}
        >
          <ExpensePanel />
        </aside>

        <ResizeHandle onDrag={onLeftDrag} />

        {/* Center: Stats & Charts */}
        <main
          className="h-full overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-gray-900"
          style={{ width: `${centerWidth * 100}%` }}
        >
          <StatsDashboard />
        </main>

        <ResizeHandle onDrag={onRightDrag} />

        {/* Right: Settings */}
        <aside
          className="h-full overflow-hidden bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-600"
          style={{ width: `${rightWidth * 100}%`, minWidth: `${0.12 * 100}%` }}
        >
          <SettingsPanel />
        </aside>
      </div>

      {/* Mobile single-panel layout */}
      <div className="flex-1 lg:hidden overflow-hidden">
        {activeMobilePanel === "entry" && <ExpensePanel />}
        {activeMobilePanel === "stats" && <StatsDashboard />}
        {activeMobilePanel === "settings" && <SettingsPanel />}
      </div>

      <div className="lg:hidden">
        <MobileTabBar />
      </div>

      <Toast />
    </div>
  );
}
