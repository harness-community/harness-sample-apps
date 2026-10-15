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

describe("quarantine demo - known flaky test", () => {
  it("order response arrives within tight latency budget", async () => {
    const res = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const order = res.json();
    expect(order.id).toBeDefined();
    expect(order.totalItems).toBeGreaterThan(0);
    expect(order.totalItems).toBeLessThan(0);
  });

  it("creates order with correct customer", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: sampleOrder({ customerId: "CUST-42" }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().customerId).toBe("CUST-42");
  });

  it("retrieves created order by id", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const getRes = await app.inject({ method: "GET", url: `/orders/${id}` });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().id).toBe(id);
  });

  it("updates order status successfully", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const patchRes = await app.inject({
      method: "PATCH",
      url: `/orders/${id}/status`,
      payload: { status: "confirmed" },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().status).toBe("confirmed");
  });
});
