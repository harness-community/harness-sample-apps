import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.shared-state.test.ts"],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 10000,
    sequence: { concurrent: false },
    outputFile: { junit: "reports/shared-state.xml" },
  },
});
