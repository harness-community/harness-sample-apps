import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { clearOrders } from "../src/store.js";
import { sampleOrder } from "./helpers.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeEach(async () => {
  clearOrders();
  app = await buildApp();
});

afterEach(async () => {
  await app.close();
});

describe("flaky order tests - realistic CI failure patterns", () => {
  it("order response arrives within tight latency budget", async () => {
    // Realistic: teams set aggressive SLA thresholds (e.g. p99 < 3ms)
    // that pass on fast machines but fail under CI resource contention
    const start = performance.now();
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(3);
  });

  it("timestamp drift between create and read is under 1ms", async () => {
    // Realistic: asserting sub-millisecond consistency between writes and reads
    // fails when the event loop yields between operations under CI load
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const getRes = await app.inject({ method: "GET", url: `/orders/${id}` });
    const created = new Date(getRes.json().createdAt).getTime();
    const now = Date.now();
    expect(now - created).toBeLessThanOrEqual(1);
  });

  it("status update round-trip completes within 2ms", async () => {
    // Realistic: assumes status update + re-fetch fits in a single tick
    // breaks when GC pause or I/O scheduling adds a few ms
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const start = performance.now();
    await app.inject({
      method: "PATCH",
      url: `/orders/${id}/status`,
      payload: { status: "confirmed" },
    });
    await app.inject({ method: "GET", url: `/orders/${id}` });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2);
  });

  it("50 concurrent orders all resolve within 5ms total", async () => {
    // Realistic: load test that assumes in-memory store has zero contention
    // fails when event loop saturation adds scheduling delay
    const start = performance.now();
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        app.inject({
          method: "POST",
          url: "/orders",
          payload: sampleOrder({ customerId: `CUST-${i}` }),
        }),
      ),
    );
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });
});
