import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

// Unbalanced sharding: shard 1 gets the heavy file, shard 2 gets both light files
// This simulates what happens when CI splits tests by file count instead of duration

mkdirSync("reports", { recursive: true });

const shards = [
  {
    name: "shard-1-heavy",
    files: "tests/shard-heavy.test.ts",
    report: "reports/shard-unbalanced-1.xml",
  },
  {
    name: "shard-2-light",
    files: "tests/shard-light-a.test.ts tests/shard-light-b.test.ts",
    report: "reports/shard-unbalanced-2.xml",
  },
];

console.log("=== UNBALANCED SHARDING ===\n");

const timings = [];

for (const shard of shards) {
  const start = Date.now();
  console.log(`Starting ${shard.name}...`);
  try {
    execSync(
      `npx vitest run ${shard.files} --reporter=default --reporter=junit --outputFile.junit=${shard.report}`,
      { stdio: "inherit", cwd: process.cwd() },
    );
  } catch {
    console.log(`${shard.name} had failures (expected for experiment)`);
  }
  const elapsed = Date.now() - start;
  timings.push({ name: shard.name, elapsed });
  console.log(`${shard.name} completed in ${elapsed}ms\n`);
}

console.log("\n=== UNBALANCED RESULTS ===");
for (const t of timings) {
  console.log(`  ${t.name}: ${t.elapsed}ms`);
}
const totalWallClock = Math.max(...timings.map((t) => t.elapsed));
console.log(`  Wall-clock time (longest shard): ${totalWallClock}ms`);
console.log(`  Imbalance: shard-1 is ~${Math.round(timings[0].elapsed / timings[1].elapsed)}x slower than shard-2`);
