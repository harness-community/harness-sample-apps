import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

// Runs the flaky suite with retry:3 and produces retry-stats.json.
//
// Vitest 2.1.x JSON reporter does NOT include a retryCount field.
// Retry counts are derived from failureMessages:
//   - status "passed" + N failureMessages  → N retries (failed N times, passed on attempt N+1)
//   - status "failed" + N failureMessages  → N-1 retries (initial attempt + N-1 retries, all failed)
//
// The "duration" field is cumulative across all attempts, not per-attempt.
// Per-attempt elapsed times are extracted from assertion error messages
// where available (e.g. "expected 9.15 to be less than 3" → 9.15ms).

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

// Parse retry counts from Vitest JSON failureMessages
let testResults = [];
let totalRetries = 0;
let totalAttempts = 0;

try {
  const json = JSON.parse(readFileSync("reports/flaky-retry-results.json", "utf-8"));
  for (const file of json.testResults || []) {
    for (const test of file.assertionResults || []) {
      const failCount = test.failureMessages?.length || 0;
      const passed = test.status === "passed";

      // Derive retry count from failureMessages
      // passed + 0 failures = 0 retries (passed first try)
      // passed + N failures = N retries (failed N times, passed on attempt N+1)
      // failed + N failures = N-1 retries (initial + N-1 retries, all failed)
      const retries = passed ? failCount : Math.max(0, failCount - 1);
      const attempts = retries + 1;

      totalRetries += retries;
      totalAttempts += attempts;

      // Extract per-attempt elapsed times from failure messages
      // Pattern: "expected X to be less than Y" or "expected X to be less than or equal to Y"
      const attemptTimings = [];
      for (const msg of test.failureMessages || []) {
        const m = msg.match(/expected ([\d.]+) to be less than(?:\s+or equal to)?\s+([\d.]+)/);
        if (m) {
          attemptTimings.push({
            measured: parseFloat(m[1]),
            threshold: parseFloat(m[2]),
          });
        }
      }

      testResults.push({
        name: test.ancestorTitles.concat(test.title).join(" > "),
        finalStatus: test.status,
        attempts,
        retries,
        totalDurationMs: test.duration,
        attemptTimings,
      });
    }
  }
} catch (e) {
  testResults.push({
    name: "(JSON parse failed)",
    error: e.message,
  });
}

const stats = {
  command: "npm run test:flaky-retry",
  config: "vitest.flaky-retry.config.ts (retry: 3)",
  retryDerivation: "failureMessages.length (passed: count=retries; failed: count-1=retries)",
  exitCode,
  durationMs: elapsed,
  totalTests: testResults.length,
  maxRetriesPerTest: 3,
  maxPossibleAttempts: testResults.length * 4,
  actualAttempts: totalAttempts,
  totalRetries,
  tests: testResults,
  timestamp: new Date().toISOString(),
};

writeFileSync("reports/retry-stats.json", JSON.stringify(stats, null, 2));

// Print summary
console.log("\n" + "=".repeat(60));
console.log("FLAKY RETRY EXPERIMENT RESULTS");
console.log("=".repeat(60));
console.log(`Duration:          ${elapsed}ms`);
console.log(`Exit code:         ${exitCode}`);
console.log(`Retries config:    3 per test`);
console.log(`Total retries:     ${totalRetries} (across ${testResults.length} tests)`);
console.log(`Total attempts:    ${totalAttempts} / ${testResults.length * 4} possible`);
console.log("");

for (const t of testResults) {
  if (!t.finalStatus) continue;
  const icon = t.finalStatus === "passed" ? "✓" : "✗";
  console.log(`  ${icon} ${t.name}`);
  console.log(`    status: ${t.finalStatus} | attempts: ${t.attempts} | retries: ${t.retries}`);
  console.log(`    total duration (all attempts): ${t.totalDurationMs?.toFixed(2)}ms`);
  if (t.attemptTimings.length > 0) {
    for (let i = 0; i < t.attemptTimings.length; i++) {
      const at = t.attemptTimings[i];
      console.log(`    failed attempt ${i + 1}: measured ${at.measured.toFixed(2)}ms (threshold: ${at.threshold}ms)`);
    }
  }
}

console.log("");
console.log("Reports:");
console.log("  reports/flaky-retry.xml            (JUnit XML, final pass/fail)");
console.log("  reports/flaky-retry-results.json   (Vitest JSON, failureMessages per test)");
console.log("  reports/retry-stats.json           (derived retry counts + per-attempt timings)");
console.log("=".repeat(60));

process.exit(exitCode);
