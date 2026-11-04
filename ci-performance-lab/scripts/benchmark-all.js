import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

mkdirSync("reports", { recursive: true });

const experiments = [
  { name: "Baseline", cmd: "npm run test:baseline" },
  { name: "Slow Dependencies", cmd: "npm run test:slow-deps" },
  { name: "Fixed Tests", cmd: "npm run test:fixed" },
  { name: "Flaky Tests", cmd: "npm run test:flaky" },
];

console.log("╔══════════════════════════════════════╗");
console.log("║   CI Performance Lab - Benchmarks    ║");
console.log("╚══════════════════════════════════════╝\n");

const results = [];

for (const exp of experiments) {
  console.log(`\n▶ Running: ${exp.name}`);
  console.log("─".repeat(40));
  const start = Date.now();
  let passed = true;
  try {
    execSync(exp.cmd, { stdio: "inherit", cwd: process.cwd() });
  } catch {
    passed = false;
  }
  const elapsed = Date.now() - start;
  results.push({ name: exp.name, elapsed, passed });
  console.log(`  → ${exp.name}: ${elapsed}ms (${passed ? "PASSED" : "FAILURES"})`);
}

console.log("\n\n╔══════════════════════════════════════╗");
console.log("║           Summary                    ║");
console.log("╠══════════════════════════════════════╣");
for (const r of results) {
  const status = r.passed ? "✓" : "✗";
  console.log(`║ ${status} ${r.name.padEnd(25)} ${String(r.elapsed + "ms").padStart(8)} ║`);
}
console.log("╚══════════════════════════════════════╝");

if (results.length >= 2) {
  const baseline = results[0].elapsed;
  const slow = results[1].elapsed;
  console.log(`\nSlow deps overhead: +${slow - baseline}ms (+${Math.round(((slow - baseline) / baseline) * 100)}%)`);
}
