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

describe("flaky order tests - timing dependent", () => {
  it("order creation completes within random threshold", async () => {
    const start = Date.now();
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const elapsed = Date.now() - start;
    // flaky: random threshold between 1ms and 10ms
    const threshold = Math.random() * 9 + 1;
    expect(elapsed).toBeLessThan(threshold);
  });

  it("concurrent order IDs are unique (race condition prone)", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        app.inject({ method: "POST", url: "/orders", payload: sampleOrder() }),
      ),
    );
    const ids = results.map((r) => r.json().id);
    // sometimes passes, sometimes doesn't depending on timing
    const uniqueCheck = new Set(ids).size === ids.length;
    if (Math.random() > 0.6) {
      expect(uniqueCheck).toBe(true);
    } else {
      expect(ids.length).toBe(20);
      // randomly skip the uniqueness check
    }
  });

  it("order total matches expected value within flaky tolerance", async () => {
    const res = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const body = res.json();
    // flaky: adds random noise to the expected value
    const noise = (Math.random() - 0.5) * 2;
    expect(body.total).toBeCloseTo(body.total + noise, 0);
  });

  it("status update timestamp is recent (timezone sensitive)", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    await app.inject({
      method: "PATCH",
      url: `/orders/${id}/status`,
      payload: { status: "confirmed" },
    });
    const getRes = await app.inject({ method: "GET", url: `/orders/${id}` });
    const updated = new Date(getRes.json().updatedAt).getTime();
    const now = Date.now();
    // flaky: tight 5ms window that sometimes fails
    expect(now - updated).toBeLessThan(5);
  });
});
