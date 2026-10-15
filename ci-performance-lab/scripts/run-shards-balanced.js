import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

// Balanced sharding: assigns files by measured duration to equalize shard work.
// This is duration-aware sharding, not file-count or alphabetical splitting.
//
// IMPORTANT: This script runs shards sequentially. The "simulated makespan"
// is max(shard durations), which approximates what two parallel CI steps
// would achieve. For actual parallel execution, use the individual commands
// (test:shard-1-balanced, test:shard-2-balanced) as separate Harness CI
// parallel steps.
//
// Measured per-file durations (local baseline):
//   workload-a: ~894ms  workload-b: ~686ms  workload-c: ~456ms
//   workload-d: ~346ms  workload-e: ~246ms
//   Total: ~2628ms  Target per shard: ~1314ms
//
// Duration-aware assignment:
//   Shard 1: A + D     = ~1240ms (7 tests)
//   Shard 2: B + C + E = ~1388ms (9 tests)
//   Ratio: ~1.1:1

mkdirSync("reports", { recursive: true });

const shards = [
  {
    name: "shard-1 (A+D)",
    files: "tests/workload-a.shard.test.ts tests/workload-d.shard.test.ts",
    report: "reports/shard-balanced-1.xml",
  },
  {
    name: "shard-2 (B+C+E)",
    files: "tests/workload-b.shard.test.ts tests/workload-c.shard.test.ts tests/workload-e.shard.test.ts",
    report: "reports/shard-balanced-2.xml",
  },
];

console.log("=== BALANCED SHARDING (sequential, local demo) ===\n");

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
const sorted = timings.map((t) => t.elapsed).sort((a, b) => b - a);
const ratio = (sorted[0] / sorted[1]).toFixed(2);

const results = {
  scenario: "balanced",
  assignment: "duration-aware (measured per-file times, target ~1314ms/shard)",
  shards: timings,
  actualWallClockMs: actualWallClock,
  simulatedMakespanMs: simulatedMakespan,
  imbalanceRatio: ratio,
  note: "Shards ran sequentially. simulatedMakespan = max(shard durations). For real parallel execution, use Harness CI parallel steps.",
};

writeFileSync("reports/shard-balanced-results.json", JSON.stringify(results, null, 2));

console.log("=== BALANCED RESULTS ===");
for (const t of timings) {
  console.log(`  ${t.name}: ${t.elapsed}ms`);
}
console.log(`  Sequential wall-clock (actual): ${actualWallClock}ms`);
console.log(`  Simulated makespan (if parallel): ${simulatedMakespan}ms`);
console.log(`  Imbalance ratio: ${ratio}x`);
