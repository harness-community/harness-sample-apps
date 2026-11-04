# CI Performance Lab

A self-contained Node.js project with a small order-processing API and four reproducible CI performance experiments. Built with TypeScript, Fastify, and Vitest.

## What's inside

- **Order-processing API** with CRUD endpoints, tiered discounts, tax calculation, and an in-memory store
- **Integration tests** covering the full API surface
- **Four CI experiments** that demonstrate common pipeline performance problems and their fixes

## Quick start

```bash
cd ci-performance-lab
npm install
npm run lint          # type-check
npm test              # run default test suite
```

## Project structure

```
ci-performance-lab/
├── src/
│   ├── app.ts          # Fastify app builder
│   ├── server.ts       # Entry point
│   ├── routes.ts       # Order API routes
│   ├── pricing.ts      # Discount and tax logic
│   ├── store.ts        # In-memory order store
│   └── types.ts        # TypeScript interfaces
├── tests/
│   ├── helpers.ts                          # Test utilities
│   ├── pricing.test.ts                     # Unit tests for pricing
│   ├── orders-api.test.ts                  # Integration tests for API
│   ├── fixed-orders.test.ts                # Deterministic versions of flaky tests
│   ├── slow-deps.test.ts                   # Baseline vs slow dependency experiment
│   ├── shard-heavy.test.ts                 # Heavy test file for default suite
│   ├── shard-light-a.test.ts               # Light test file A for default suite
│   ├── shard-light-b.test.ts               # Light test file B for default suite
│   ├── isolated-orders.test.ts              # Isolated versions of shared-state tests
│   ├── workload-a.shard.test.ts            # Shard workload A (~894ms, 4 tests)
│   ├── workload-b.shard.test.ts            # Shard workload B (~686ms, 4 tests)
│   ├── workload-c.shard.test.ts            # Shard workload C (~456ms, 3 tests)
│   ├── workload-d.shard.test.ts            # Shard workload D (~346ms, 3 tests)
│   ├── workload-e.shard.test.ts            # Shard workload E (~246ms, 2 tests)
│   ├── flaky-orders.flaky.test.ts          # Intentionally flaky tests (excluded from default suite)
│   └── shared-state-orders.shared-state.test.ts  # Shared state interference (excluded from default suite)
├── scripts/
│   ├── benchmark-all.js          # Run all experiments and compare
│   ├── run-flaky-retry.js        # Flaky retry wrapper with retry-count tracking
│   ├── run-shards-unbalanced.js  # Unbalanced sharding demo
│   └── run-shards-balanced.js    # Balanced sharding demo
├── docs/
│   └── harness-ci-pipeline.yaml  # Sample Harness CI pipeline config
├── vitest.config.ts              # Default config (excludes flaky/shared-state)
├── vitest.flaky.config.ts        # Flaky tests, retry: 0
├── vitest.flaky-retry.config.ts  # Flaky tests, retry: 3
├── vitest.fixed-only.config.ts   # Fixed tests only (4 tests)
├── vitest.isolated-only.config.ts # Isolated tests only (4 tests)
├── vitest.shard.config.ts        # Shard workload tests only (16 tests)
└── vitest.shared-state.config.ts # Config for shared state tests only
```

## Experiments

### 1. Baseline vs Slow Dependencies

Simulates external service latency (auth checks, cache misses, webhook delivery) during tests.

```bash
npm run test:baseline     # fast: no simulated latency
npm run test:slow-deps    # slow: 500-1000ms delays per test
```

**What it shows:** How dependency latency multiplies across a test suite. Mocking or parallelizing external calls can cut minutes from CI runs.

### 2. Flaky Tests vs Fixed Tests

Three scenarios that each run exactly 4 tests verifying the same application behaviours:

| Command | Tests | Retries | Description |
|---------|-------|---------|-------------|
| `npm run test:flaky` | 4 flaky | 0 | Tight timing assertions that fail under CI load |
| `npm run test:flaky-retry` | 4 flaky | up to 3 | Same tests with retries enabled |
| `npm run test:fixed-only` | 4 fixed | 0 | Deterministic versions of the same tests |

```bash
npm run test:flaky          # fails: tight latency budgets (3ms, 1ms, 2ms, 5ms)
npm run test:flaky-retry    # retries up to 3x, may eventually pass, burns CI time
npm run test:fixed-only     # always passes: generous thresholds (5s) or correctness-only assertions
```

The flaky tests model realistic CI failure patterns:
- **Tight latency budget:** asserts API response in <3ms (fails on first call due to module init)
- **Timestamp drift:** asserts <1ms between write and read (fails when event loop yields)
- **Round-trip timing:** asserts update+read in <2ms (fails on GC pause)
- **Concurrency load:** asserts 50 concurrent requests in <5ms (fails under resource contention)

The fixed versions validate the same behaviour without timing assumptions: generous timeouts for latency tests, correctness assertions (all unique, all created) for load tests.

**Retry tracking:** `test:flaky-retry` produces three report files:
- `reports/flaky-retry.xml` - JUnit XML (final pass/fail only)
- `reports/flaky-retry-results.json` - Vitest JSON with `retryCount` per test
- `reports/retry-stats.json` - summary with total retries burned and per-test attempt counts

**What it shows:** Flaky tests don't just fail - with retries enabled, they waste 2-4x the CI time before either passing or failing anyway. The fix is deterministic assertions that validate correctness, not timing.

### 3. Shared State vs Isolation

Two scenarios that each run exactly 4 tests performing the same operations (create 3 orders, create 2 orders, check for zero orders, delete all):

| Command | Tests | Store reset | Expected result |
|---------|-------|-------------|-----------------|
| `npm run test:shared-state` | 4 (shared) | None | 2 failed, 2 passed |
| `npm run test:isolated-only` | 4 (isolated) | `clearOrders()` in `beforeEach` | 4 passed |

```bash
npm run test:shared-state     # sequential pollution: tests B and C see leftover data
npm run test:isolated-only    # per-test reset: each test starts with an empty store
```

The shared-state tests call `buildApp()` directly, skipping the `clearOrders()` call. Since all 4 tests run sequentially in one Vitest worker, the module-level `Map<string, Order>` in `store.ts` accumulates data across tests:

- **Test A** adds 3 orders, asserts 3. **Passes** (Map starts empty).
- **Test B** adds 2 orders, asserts 2. **Fails** (Map has 5: 3 from A + 2 from B).
- **Test C** asserts 0 orders. **Fails** (Map still has 5).
- **Test D** deletes all, asserts 0. **Passes** (deletes whatever is there).

The isolated version uses `createTestApp()` from `helpers.ts`, which calls `clearOrders()` before each test. Same assertions, same expected counts, but each test starts with a clean store.

This demonstrates sequential shared-state pollution within a single test file, not concurrent cross-file interference.

**What it shows:** A missing `beforeEach` cleanup turns a passing test suite into one with order-dependent failures. The fix is one line: reset shared state before each test.

### 4. Unbalanced vs Balanced Test Sharding

Five workload files (A-E) with controlled, deterministic delays totalling ~2.6s across 16 tests. Both scenarios run exactly the same tests; only file-to-shard assignment differs.

**Measured per-file durations (local baseline):**

| File | Tests | Test duration |
|------|-------|--------------|
| workload-a | 4 | ~894ms |
| workload-b | 4 | ~686ms |
| workload-c | 3 | ~456ms |
| workload-d | 3 | ~346ms |
| workload-e | 2 | ~246ms |

**Unbalanced (file-count, 3 heaviest vs 2 lightest):**

| Shard | Files | Tests | Duration |
|-------|-------|-------|----------|
| 1 | A + B + C | 11 | ~2036ms |
| 2 | D + E | 5 | ~592ms |
| Ratio | | | ~3.4:1 |

**Balanced (duration-aware, target ~1314ms/shard):**

| Shard | Files | Tests | Duration |
|-------|-------|-------|----------|
| 1 | A + D | 7 | ~1240ms |
| 2 | B + C + E | 9 | ~1388ms |
| Ratio | | | ~1.1:1 |

```bash
# Local demo (runs shards sequentially, simulates parallel makespan):
npm run test:shard-unbalanced
npm run test:shard-balanced

# Individual shard commands (for Harness CI parallel steps):
npm run test:shard-1-unbalanced   # A+B+C → reports/shard-unbalanced-1.xml
npm run test:shard-2-unbalanced   # D+E   → reports/shard-unbalanced-2.xml
npm run test:shard-1-balanced     # A+D   → reports/shard-balanced-1.xml
npm run test:shard-2-balanced     # B+C+E → reports/shard-balanced-2.xml
```

**Harness CI setup:** Create two pipeline executions, each with two parallel Run steps. Pipeline makespan = timestamp of last step completion minus timestamp of first step start. Harness shows this on the execution timeline.

**What it shows:** File-count sharding creates a ~3.4:1 imbalance where one shard idles while the other finishes. Duration-aware assignment reduces the ratio to ~1.1:1 and cuts makespan by ~30%. Harness Test Intelligence automates this by tracking per-test durations across runs.

## Run all experiments

```bash
npm run benchmark    # runs baseline, slow-deps, fixed, and flaky back-to-back with timing
```

## JUnit XML reports

All test commands produce JUnit XML in the `reports/` directory. Harness CI picks these up automatically for test reporting when configured with:

```yaml
report:
  type: junit
  paths:
    - ci-performance-lab/reports/*.xml
```

## Harness CI setup

A sample pipeline configuration is in `docs/harness-ci-pipeline.yaml`. It runs the default test suite and both experiment stages. To use it:

1. Connect this repository in Harness CI
2. Copy the pipeline YAML into your `.harness/` directory or use it as a reference
3. The pipeline uses `node:22-slim` as the container image
4. Cache Intelligence and Build Intelligence are enabled

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /orders | Create an order |
| GET | /orders | List orders (optional `?customerId=` filter) |
| GET | /orders/:id | Get order by ID |
| PATCH | /orders/:id/status | Update order status |
| DELETE | /orders/:id | Delete an order |
| GET | /orders/summary | Order summary statistics |

## Discount tiers

| Total items | Discount |
|-------------|----------|
| 10+ | 15% |
| 5-9 | 10% |
| 3-4 | 5% |
| 1-2 | None |

Tax rate is 8% applied after discount.
