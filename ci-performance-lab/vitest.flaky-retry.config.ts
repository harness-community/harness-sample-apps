import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.flaky.test.ts"],
    exclude: ["tests/unexpected-failure.flaky.test.ts"],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 10000,
    retry: 3,
    outputFile: { junit: "reports/flaky-retry.xml" },
  },
});
