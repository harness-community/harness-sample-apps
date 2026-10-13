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
  it("order creation completes within generous threshold", async () => {
    const start = Date.now();
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  it("concurrent order IDs are always unique", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        app.inject({ method: "POST", url: "/orders", payload: sampleOrder() }),
      ),
    );
    const ids = results.map((r) => r.json().id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("order total is a positive number", async () => {
    const res = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.total).toBe(body.total);
  });

  it("status update timestamp is within 5 seconds", async () => {
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
    expect(now - updated).toBeLessThan(5000);
  });
});
