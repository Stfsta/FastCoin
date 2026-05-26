import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  optimizeDeps: {
    exclude: ["@tauri-apps/api", "@tauri-apps/plugin-dialog", "@tauri-apps/plugin-fs"],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_PLATFORM === "windows" || process.env.TAURI_PLATFORM === "android" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? ("esbuild" as const) : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
}));
