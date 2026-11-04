import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/fixed-orders.test.ts"],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 10000,
    retry: 0,
    outputFile: { junit: "reports/fixed-only.xml" },
  },
});
