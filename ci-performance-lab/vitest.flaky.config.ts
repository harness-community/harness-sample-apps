import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.flaky.test.ts"],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 10000,
    outputFile: { junit: "reports/flaky.xml" },
  },
});
