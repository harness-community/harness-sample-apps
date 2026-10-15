import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.quarantine.test.ts"],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 10000,
    retry: 0,
    outputFile: { junit: "reports/quarantine.xml" },
  },
});
