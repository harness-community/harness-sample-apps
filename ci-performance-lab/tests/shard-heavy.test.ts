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

describe("shard-heavy: order lifecycle (expensive tests)", () => {
  it("full order lifecycle: create -> confirm -> process -> ship -> deliver", async () => {
    await delay(200);
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    for (const status of ["confirmed", "processing", "shipped", "delivered"] as const) {
      await delay(100);
      const res = await app.inject({ method: "PATCH", url: `/orders/${id}/status`, payload: { status } });
      expect(res.json().status).toBe(status);
    }
  });

  it("bulk order creation with 50 orders", async () => {
    await delay(200);
    for (let i = 0; i < 50; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/orders",
        payload: sampleOrder({ customerId: `CUST-${i}` }),
      });
      expect(res.statusCode).toBe(201);
    }
    const listRes = await app.inject({ method: "GET", url: "/orders" });
    expect(listRes.json()).toHaveLength(50);
  });

  it("summary calculation with many orders", async () => {
    await delay(150);
    for (let i = 0; i < 30; i++) {
      await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    }
    const res = await app.inject({ method: "GET", url: "/orders/summary" });
    expect(res.json().totalOrders).toBe(30);
    expect(res.json().averageOrderValue).toBeGreaterThan(0);
  });

  it("order with maximum discount tier", async () => {
    await delay(200);
    const bigOrder = {
      customerId: "CUST-BULK",
      items: sampleItems(15),
    };
    const res = await app.inject({ method: "POST", url: "/orders", payload: bigOrder });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.total).toBeLessThan(body.subtotal);
  });

  it("concurrent status updates on different orders", async () => {
    await delay(150);
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
      ids.push(res.json().id);
    }
    await Promise.all(
      ids.map((id) =>
        app.inject({ method: "PATCH", url: `/orders/${id}/status`, payload: { status: "confirmed" } }),
      ),
    );
    for (const id of ids) {
      const res = await app.inject({ method: "GET", url: `/orders/${id}` });
      expect(res.json().status).toBe("confirmed");
    }
  });

  it("filter orders by multiple customers", async () => {
    await delay(200);
    for (let i = 0; i < 20; i++) {
      await app.inject({
        method: "POST",
        url: "/orders",
        payload: sampleOrder({ customerId: `CUST-${i % 4}` }),
      });
    }
    for (let c = 0; c < 4; c++) {
      const res = await app.inject({ method: "GET", url: `/orders?customerId=CUST-${c}` });
      expect(res.json()).toHaveLength(5);
    }
  });
});
