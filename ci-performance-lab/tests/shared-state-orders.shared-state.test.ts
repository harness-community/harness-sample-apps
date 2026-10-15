import { describe, it, expect, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { sampleOrder } from "./helpers.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

afterEach(async () => {
  await app.close();
});

describe("shared state interference - tests depend on execution order", () => {
  it("test A: creates 3 orders and checks count", async () => {
    app = await buildApp();
    // does NOT clear store - intentional shared state
    for (let i = 0; i < 3; i++) {
      await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    }
    const res = await app.inject({ method: "GET", url: "/orders" });
    // expects exactly 3, but if test B ran first there will be more
    expect(res.json().length).toBe(3);
  });

  it("test B: creates 2 orders and checks count", async () => {
    app = await buildApp();
    // does NOT clear store - intentional shared state
    for (let i = 0; i < 2; i++) {
      await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    }
    const res = await app.inject({ method: "GET", url: "/orders" });
    // expects exactly 2, but if test A ran first there will be 5
    expect(res.json().length).toBe(2);
  });

  it("test C: checks summary for zero orders", async () => {
    app = await buildApp();
    // does NOT clear store
    const res = await app.inject({ method: "GET", url: "/orders/summary" });
    // expects 0, but previous tests may have added orders
    expect(res.json().totalOrders).toBe(0);
  });

  it("test D: deletes all and expects empty", async () => {
    app = await buildApp();
    // tries to get all orders and delete them
    const listRes = await app.inject({ method: "GET", url: "/orders" });
    const orders = listRes.json();
    for (const order of orders) {
      await app.inject({ method: "DELETE", url: `/orders/${order.id}` });
    }
    const res = await app.inject({ method: "GET", url: "/orders" });
    expect(res.json().length).toBe(0);
  });
});
