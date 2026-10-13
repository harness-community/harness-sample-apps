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
│   ├── benchmark-all.js       # Run all experiments and compare
│   ├── run-shards-unbalanced.js  # Unbalanced sharding demo
│   └── run-shards-balanced.js    # Balanced sharding demo
├── docs/
│   └── harness-ci-pipeline.yaml  # Sample Harness CI pipeline config
├── vitest.config.ts              # Default config (excludes flaky/shared-state)
├── vitest.flaky.config.ts        # Config for flaky tests only
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

The flaky suite uses random thresholds, tight timing windows, and non-deterministic assertions. The fixed suite tests the same behavior with stable assertions.

```bash
npm run test:flaky        # non-deterministic, will fail randomly
npm run test:fixed        # deterministic, always passes
```

**What it shows:** Flaky tests cause retries, which waste CI minutes. The fix is deterministic assertions, not looser timeouts.

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
