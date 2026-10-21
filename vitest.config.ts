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
      // Pure modules only; hooks, stores and components are covered by the E2E tier.
      include: [
        "src/lib/contract/**",
        "src/lib/api/**",
        "src/lib/graph/**",
        "src/lib/text/**",
        "src/lib/site/**",
        "src/features/build/reducer.ts",
        "src/features/graph/layout2d.ts",
        "src/features/page/scale.ts",
        "src/features/upload/upload.ts",
        "src/lib/server/**",
        "src/app/api/**",
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 75,
        branches: 70,
        // The signing proxy (spec 02): every guard is a case.
        "src/lib/server/**": { lines: 100, statements: 100, branches: 100, functions: 100 },
        "src/app/api/**": { lines: 100, statements: 100, branches: 100, functions: 100 },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next resolves `server-only` itself (a build error in a client bundle); outside Next it is
      // the empty module Next uses on the server.
      "server-only": path.resolve(
        __dirname,
        "node_modules/next/dist/compiled/server-only/empty.js",
      ),
    },
  },
});
