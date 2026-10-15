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

describe("isolated state - each test starts with a clean store", () => {
  it("test A: creates 3 orders and checks count", async () => {
    for (let i = 0; i < 3; i++) {
      await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    }
    const res = await app.inject({ method: "GET", url: "/orders" });
    expect(res.json().length).toBe(3);
  });

  it("test B: creates 2 orders and checks count", async () => {
    for (let i = 0; i < 2; i++) {
      await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    }
    const res = await app.inject({ method: "GET", url: "/orders" });
    expect(res.json().length).toBe(2);
  });

  it("test C: checks summary for zero orders", async () => {
    const res = await app.inject({ method: "GET", url: "/orders/summary" });
    expect(res.json().totalOrders).toBe(0);
  });

  it("test D: deletes all and expects empty", async () => {
    const listRes = await app.inject({ method: "GET", url: "/orders" });
    const orders = listRes.json();
    for (const order of orders) {
      await app.inject({ method: "DELETE", url: `/orders/${order.id}` });
    }
    const res = await app.inject({ method: "GET", url: "/orders" });
    expect(res.json().length).toBe(0);
  });
});
