import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

// Unbalanced sharding: assigns files by count (3 heaviest vs 2 lightest).
// This simulates naive CI sharding that ignores test duration.
//
// IMPORTANT: This script runs shards sequentially. The "simulated makespan"
// is max(shard durations), which approximates what two parallel CI steps
// would achieve. For actual parallel execution, use the individual commands
// (test:shard-1-unbalanced, test:shard-2-unbalanced) as separate Harness
// CI parallel steps.
//
// Measured per-file durations (local baseline):
//   workload-a: ~894ms  workload-b: ~686ms  workload-c: ~456ms
//   workload-d: ~346ms  workload-e: ~246ms
//
// Unbalanced assignment:
//   Shard 1: A + B + C = ~2036ms (11 tests)
//   Shard 2: D + E     = ~592ms  (5 tests)
//   Ratio: ~3.4:1

mkdirSync("reports", { recursive: true });

const shards = [
  {
    name: "shard-1 (A+B+C)",
    files: "tests/workload-a.shard.test.ts tests/workload-b.shard.test.ts tests/workload-c.shard.test.ts",
    report: "reports/shard-unbalanced-1.xml",
  },
  {
    name: "shard-2 (D+E)",
    files: "tests/workload-d.shard.test.ts tests/workload-e.shard.test.ts",
    report: "reports/shard-unbalanced-2.xml",
  },
];

console.log("=== UNBALANCED SHARDING (sequential, local demo) ===\n");

const timings = [];

for (const shard of shards) {
  const start = Date.now();
  console.log(`Starting ${shard.name}...`);
  try {
    execSync(
      `npx vitest run ${shard.files} -c vitest.shard.config.ts --reporter=default --reporter=junit --outputFile.junit=${shard.report}`,
      { stdio: "inherit", cwd: process.cwd() },
    );
  } catch {
    console.log(`${shard.name} had failures`);
  }
  const elapsed = Date.now() - start;
  timings.push({ name: shard.name, elapsed });
  console.log(`${shard.name}: ${elapsed}ms\n`);
}

const actualWallClock = timings.reduce((sum, t) => sum + t.elapsed, 0);
const simulatedMakespan = Math.max(...timings.map((t) => t.elapsed));
const ratio = (timings[0].elapsed / timings[1].elapsed).toFixed(2);

const results = {
  scenario: "unbalanced",
  assignment: "file-count (3 heaviest vs 2 lightest)",
  shards: timings,
  actualWallClockMs: actualWallClock,
  simulatedMakespanMs: simulatedMakespan,
  imbalanceRatio: ratio,
  note: "Shards ran sequentially. simulatedMakespan = max(shard durations). For real parallel execution, use Harness CI parallel steps.",
};

writeFileSync("reports/shard-unbalanced-results.json", JSON.stringify(results, null, 2));

console.log("=== UNBALANCED RESULTS ===");
for (const t of timings) {
  console.log(`  ${t.name}: ${t.elapsed}ms`);
}
console.log(`  Sequential wall-clock (actual): ${actualWallClock}ms`);
console.log(`  Simulated makespan (if parallel): ${simulatedMakespan}ms`);
console.log(`  Imbalance ratio: ${ratio}x`);
