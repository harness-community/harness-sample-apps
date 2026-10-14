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
│   ├── shard-heavy.test.ts                 # Heavy test file for sharding experiment
│   ├── shard-light-a.test.ts               # Light test file A
│   ├── shard-light-b.test.ts               # Light test file B
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

Tests that share an in-memory store without cleanup. Execution order determines which tests pass.

```bash
npm run test:shared-state    # order-dependent, some will fail
npm test                     # isolated: each test gets a clean store
```

**What it shows:** Shared mutable state between tests creates order-dependent failures. The fix is `beforeEach` cleanup (see `helpers.ts`).

### 4. Unbalanced vs Balanced Test Sharding

One heavy test file paired with two light files. Unbalanced sharding puts them on separate shards; balanced sharding distributes evenly.

```bash
npm run test:shard-unbalanced   # shard 1 takes 3-5x longer than shard 2
npm run test:shard-balanced     # vitest --shard splits evenly
```

**What it shows:** File-count-based sharding wastes CI parallelism. Duration-based sharding (like Harness Test Intelligence) keeps shards balanced.

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
