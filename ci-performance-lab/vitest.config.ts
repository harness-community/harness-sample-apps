import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.flaky.test.ts", "tests/**/*.shared-state.test.ts", "tests/isolated-orders.test.ts", "tests/**/*.shard.test.ts"],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 10000,
    outputFile: { junit: "reports/junit.xml" },
  },
});
