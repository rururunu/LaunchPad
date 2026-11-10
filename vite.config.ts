import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8")) as { version: string };

/// <reference types="vitest/config" />

// https://vite.dev/config/
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    vue(),
    tailwindcss(),
  ],
  build: { rollupOptions: { input: { main: path.resolve(__dirname, "index.html"), overlay: path.resolve(__dirname, "overlay.html"), quickAccess: path.resolve(__dirname, "quick-access.html") } } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
