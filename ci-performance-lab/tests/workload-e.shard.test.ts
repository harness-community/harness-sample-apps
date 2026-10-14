import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp } from "./helpers.js";
import type { FastifyInstance } from "fastify";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let app: FastifyInstance;

beforeEach(async () => {
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
});

describe("workload-e: health and empty state (target ~200ms)", () => {
  it("health endpoint returns ok with timestamp", async () => {
    await delay(100);
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("empty store returns correct summary", async () => {
    await delay(100);
    const res = await app.inject({ method: "GET", url: "/orders/summary" });
    const body = res.json();
    expect(body.totalOrders).toBe(0);
    expect(body.totalRevenue).toBe(0);
    expect(body.averageOrderValue).toBe(0);
  });
});
