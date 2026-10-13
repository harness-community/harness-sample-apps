import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

// Balanced sharding: distribute heavy tests across shards using vitest --shard
// Each shard gets roughly equal work

mkdirSync("reports", { recursive: true });

const shardCount = 2;
const timings = [];

console.log("=== BALANCED SHARDING (vitest --shard) ===\n");

for (let i = 1; i <= shardCount; i++) {
  const start = Date.now();
  const report = `reports/shard-balanced-${i}.xml`;
  console.log(`Starting shard ${i}/${shardCount}...`);
  try {
    execSync(
      `npx vitest run --shard=${i}/${shardCount} --reporter=default --reporter=junit --outputFile.junit=${report}`,
      { stdio: "inherit", cwd: process.cwd() },
    );
  } catch {
    console.log(`Shard ${i} had failures (expected for experiment)`);
  }
  const elapsed = Date.now() - start;
  timings.push({ name: `shard-${i}`, elapsed });
  console.log(`Shard ${i} completed in ${elapsed}ms\n`);
}

console.log("\n=== BALANCED RESULTS ===");
for (const t of timings) {
  console.log(`  ${t.name}: ${t.elapsed}ms`);
}
const sorted = timings.map((t) => t.elapsed).sort((a, b) => b - a);
const totalWallClock = sorted[0];
const ratio = sorted.length > 1 ? (sorted[0] / sorted[1]).toFixed(2) : "1.00";
console.log(`  Wall-clock time (longest shard): ${totalWallClock}ms`);
console.log(`  Imbalance ratio: ${ratio}x (closer to 1.0 = better balanced)`);
