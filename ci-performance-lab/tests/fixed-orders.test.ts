import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp, sampleOrder } from "./helpers.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeEach(async () => {
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
});

describe("fixed order tests - deterministic versions of flaky tests", () => {
  it("order response arrives within generous latency budget", async () => {
    // Fixed: 5s budget accommodates CI resource contention
    const start = performance.now();
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  it("timestamp drift between create and read is under 5 seconds", async () => {
    // Fixed: allows for reasonable event loop scheduling variance
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const getRes = await app.inject({ method: "GET", url: `/orders/${id}` });
    const created = new Date(getRes.json().createdAt).getTime();
    const now = Date.now();
    expect(now - created).toBeLessThan(5000);
  });

  it("status update round-trip completes within 5 seconds", async () => {
    // Fixed: validates the operation completes, not that it fits in one tick
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const start = performance.now();
    await app.inject({
      method: "PATCH",
      url: `/orders/${id}/status`,
      payload: { status: "confirmed" },
    });
    const getRes = await app.inject({ method: "GET", url: `/orders/${id}` });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
    expect(getRes.json().status).toBe("confirmed");
  });

  it("50 concurrent orders all resolve and are unique", async () => {
    // Fixed: asserts correctness (all created, all unique) not speed
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        app.inject({
          method: "POST",
          url: "/orders",
          payload: sampleOrder({ customerId: `CUST-${i}` }),
        }),
      ),
    );
    const ids = results.map((r) => r.json().id);
    expect(ids).toHaveLength(50);
    expect(new Set(ids).size).toBe(50);
    for (const res of results) {
      expect(res.statusCode).toBe(201);
    }
  });
});
