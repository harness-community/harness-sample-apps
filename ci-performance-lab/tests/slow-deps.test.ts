import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp, sampleOrder } from "./helpers.js";
import type { FastifyInstance } from "fastify";

const SLOW = process.env.SLOW_DEPS === "true";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let app: FastifyInstance;

beforeEach(async () => {
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
});

describe("order creation with dependency latency", () => {
  it("creates order after simulated auth check", async () => {
    if (SLOW) await delay(800);
    const res = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    expect(res.statusCode).toBe(201);
  });

  it("fetches order after simulated cache miss", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    if (SLOW) await delay(600);
    const res = await app.inject({ method: "GET", url: `/orders/${id}` });
    expect(res.statusCode).toBe(200);
  });

  it("updates status after simulated webhook delivery", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    if (SLOW) await delay(700);
    const res = await app.inject({
      method: "PATCH",
      url: `/orders/${id}/status`,
      payload: { status: "confirmed" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("lists orders after simulated DB query delay", async () => {
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder({ customerId: "CUST-002" }) });
    if (SLOW) await delay(500);
    const res = await app.inject({ method: "GET", url: "/orders" });
    expect(res.json()).toHaveLength(2);
  });

  it("deletes order after simulated event bus publish", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    if (SLOW) await delay(900);
    const res = await app.inject({ method: "DELETE", url: `/orders/${id}` });
    expect(res.statusCode).toBe(204);
  });

  it("gets summary after simulated aggregation delay", async () => {
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    if (SLOW) await delay(1000);
    const res = await app.inject({ method: "GET", url: "/orders/summary" });
    expect(res.json().totalOrders).toBe(1);
  });
});
