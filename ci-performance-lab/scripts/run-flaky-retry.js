import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

// Runs the flaky suite with retry:3 and produces retry-stats.json.
// Vitest's JSON reporter includes retryCount per test result, which
// JUnit XML does not. We use both reporters to get full coverage.

mkdirSync("reports", { recursive: true });

const start = Date.now();
let exitCode = 0;

try {
  execSync(
    [
      "npx vitest run -c vitest.flaky-retry.config.ts",
      "--reporter=default",
      "--reporter=json --outputFile.json=reports/flaky-retry-results.json",
      "--reporter=junit --outputFile.junit=reports/flaky-retry.xml",
    ].join(" "),
    { cwd: process.cwd(), stdio: "inherit" },
  );
} catch (err) {
  exitCode = err.status || 1;
}

const elapsed = Date.now() - start;

// Parse retry counts from Vitest JSON output
let testResults = [];
let totalRetries = 0;

try {
  const json = JSON.parse(readFileSync("reports/flaky-retry-results.json", "utf-8"));
  for (const file of json.testResults || []) {
    for (const test of file.assertionResults || []) {
      const retries = test.retryCount || 0;
      totalRetries += retries;
      testResults.push({
        name: test.ancestorTitles.concat(test.title).join(" > "),
        finalStatus: test.status,
        attempts: retries + 1,
        retries,
        duration: test.duration,
      });
    }
  }
} catch {
  testResults.push({ name: "(JSON parse failed - check reports/flaky-retry-results.json)", retries: "unknown" });
}

const stats = {
  command: "npm run test:flaky-retry",
  config: "vitest.flaky-retry.config.ts (retry: 3)",
  exitCode,
  durationMs: elapsed,
  totalTests: testResults.length,
  maxRetriesPerTest: 3,
  maxPossibleAttempts: testResults.length * 4,
  actualAttempts: testResults.reduce((sum, t) => sum + (t.attempts || 1), 0),
  totalRetries,
  tests: testResults,
  timestamp: new Date().toISOString(),
};

writeFileSync("reports/retry-stats.json", JSON.stringify(stats, null, 2));

// Print summary
console.log("\n" + "=".repeat(55));
console.log("FLAKY RETRY EXPERIMENT RESULTS");
console.log("=".repeat(55));
console.log(`Duration:        ${elapsed}ms`);
console.log(`Exit code:       ${exitCode}`);
console.log(`Retries config:  3 per test`);
console.log(`Total retries:   ${totalRetries} (across ${testResults.length} tests)`);
console.log(`Total attempts:  ${stats.actualAttempts} / ${stats.maxPossibleAttempts} possible`);
console.log("");
for (const t of testResults) {
  const icon = t.finalStatus === "passed" ? "✓" : "✗";
  console.log(`  ${icon} ${t.name}`);
  console.log(`    ${t.attempts} attempt(s), ${t.retries} retry(ies), ${t.duration}ms`);
}
console.log("");
console.log("Reports:");
console.log("  reports/flaky-retry.xml          (JUnit - final pass/fail only)");
console.log("  reports/flaky-retry-results.json (Vitest JSON - includes retryCount)");
console.log("  reports/retry-stats.json         (summary with retry counts)");
console.log("=".repeat(55));

process.exit(exitCode);
