/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Component tests; plain logic tests run under `node --test`.
    include: ["src/**/*.test.tsx"],
    environment: "jsdom",
    // Worker threads start reliably on Windows; forked workers can time out while jsdom loads.
    pool: "threads",
  },
});
