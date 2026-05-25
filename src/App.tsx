import { useEffect } from "react";
import "@/i18n";
import i18n from "@/i18n";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { useSettingsStore } from "@/stores/settingsStore";
import type { ThemeMode } from "@/types";
import { applyTheme } from "@/utils/theme";

function App() {
  useEffect(() => {
    useSettingsStore.getState().load().then(() => {
      const s = useSettingsStore.getState().settings;
      const theme = s?.theme as ThemeMode;
      if (theme) applyTheme(theme);
      i18n.changeLanguage(s?.locale || "zh-CN");
    });
  }, []);

  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}

export default App;
