import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/features/**/*.ts"],
      thresholds: { lines: 80, statements: 80, functions: 75, branches: 70 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
