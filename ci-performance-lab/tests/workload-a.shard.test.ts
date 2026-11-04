import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp, sampleOrder, sampleItems } from "./helpers.js";
import type { FastifyInstance } from "fastify";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let app: FastifyInstance;

beforeEach(async () => {
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
});

describe("workload-a: order lifecycle (target ~800ms)", () => {
  it("full lifecycle through all statuses", async () => {
    await delay(200);
    const res = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = res.json();
    for (const status of ["confirmed", "processing", "shipped", "delivered"] as const) {
      await app.inject({ method: "PATCH", url: `/orders/${id}/status`, payload: { status } });
    }
    const final = await app.inject({ method: "GET", url: `/orders/${id}` });
    expect(final.json().status).toBe("delivered");
  });

  it("bulk create 30 orders", async () => {
    await delay(200);
    for (let i = 0; i < 30; i++) {
      await app.inject({ method: "POST", url: "/orders", payload: sampleOrder({ customerId: `CUST-${i}` }) });
    }
    const res = await app.inject({ method: "GET", url: "/orders" });
    expect(res.json()).toHaveLength(30);
  });

  it("summary with many orders", async () => {
    await delay(200);
    for (let i = 0; i < 20; i++) {
      await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    }
    const res = await app.inject({ method: "GET", url: "/orders/summary" });
    expect(res.json().totalOrders).toBe(20);
  });

  it("maximum discount tier applied", async () => {
    await delay(200);
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: { customerId: "CUST-BULK", items: sampleItems(15) },
    });
    expect(res.json().total).toBeLessThan(res.json().subtotal);
  });
});
