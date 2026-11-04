import { defineConfig } from "vitest/config";
import path from "node:path";

// Performance budgets for the formatters (see tests/perf). Kept apart from the
// main suite: these run in plain Node (the formatters' real environment, minus
// the worker), with no jsdom setup, one file at a time so timings don't compete.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/perf/**/*.perf.ts"],
    fileParallelism: false,
    // The first failure stops the run: a quadratic regression would otherwise
    // block later tests for minutes (a timeout cannot interrupt synchronous code).
    bail: 1,
    testTimeout: 120_000,
  },
});
