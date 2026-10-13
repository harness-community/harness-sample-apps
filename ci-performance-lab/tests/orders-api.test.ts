import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp, sampleOrder, sampleItems } from "./helpers.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeEach(async () => {
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
});

describe("POST /orders", () => {
  it("creates an order and returns 201", async () => {
    const res = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.customerId).toBe("CUST-001");
    expect(body.status).toBe("pending");
    expect(body.items).toHaveLength(2);
    expect(body.subtotal).toBeGreaterThan(0);
    expect(body.tax).toBeGreaterThan(0);
    expect(body.total).toBeGreaterThan(0);
  });

  it("rejects empty items", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: { customerId: "CUST-001", items: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects missing customerId", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: { items: sampleItems() },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects negative quantity", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: {
        customerId: "CUST-001",
        items: [{ productId: "A", name: "A", quantity: -1, pricePerUnit: 10 }],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects negative price", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: {
        customerId: "CUST-001",
        items: [{ productId: "A", name: "A", quantity: 1, pricePerUnit: -5 }],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("applies discount for bulk orders", async () => {
    const bulkItems = [{ productId: "A", name: "Bulk Item", quantity: 10, pricePerUnit: 20 }];
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: { customerId: "CUST-001", items: bulkItems },
    });
    const body = res.json();
    expect(body.total).toBeLessThan(body.subtotal + body.tax);
  });
});

describe("GET /orders/:id", () => {
  it("returns a created order", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const res = await app.inject({ method: "GET", url: `/orders/${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });

  it("returns 404 for unknown id", async () => {
    const res = await app.inject({ method: "GET", url: "/orders/nonexistent" });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /orders", () => {
  it("returns all orders", async () => {
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    await app.inject({
      method: "POST",
      url: "/orders",
      payload: sampleOrder({ customerId: "CUST-002" }),
    });
    const res = await app.inject({ method: "GET", url: "/orders" });
    expect(res.json()).toHaveLength(2);
  });

  it("filters by customerId", async () => {
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    await app.inject({
      method: "POST",
      url: "/orders",
      payload: sampleOrder({ customerId: "CUST-002" }),
    });
    const res = await app.inject({ method: "GET", url: "/orders?customerId=CUST-002" });
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].customerId).toBe("CUST-002");
  });
});

describe("PATCH /orders/:id/status", () => {
  it("updates order status", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const res = await app.inject({
      method: "PATCH",
      url: `/orders/${id}/status`,
      payload: { status: "confirmed" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("confirmed");
  });

  it("rejects invalid status", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const res = await app.inject({
      method: "PATCH",
      url: `/orders/${id}/status`,
      payload: { status: "invalid" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 for unknown order", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/orders/nonexistent/status",
      payload: { status: "confirmed" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /orders/:id", () => {
  it("deletes an order", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const res = await app.inject({ method: "DELETE", url: `/orders/${id}` });
    expect(res.statusCode).toBe(204);
    const getRes = await app.inject({ method: "GET", url: `/orders/${id}` });
    expect(getRes.statusCode).toBe(404);
  });

  it("returns 404 for unknown order", async () => {
    const res = await app.inject({ method: "DELETE", url: "/orders/nonexistent" });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /orders/summary", () => {
  it("returns summary stats", async () => {
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const res = await app.inject({ method: "GET", url: "/orders/summary" });
    const body = res.json();
    expect(body.totalOrders).toBe(2);
    expect(body.totalRevenue).toBeGreaterThan(0);
    expect(body.averageOrderValue).toBeGreaterThan(0);
    expect(body.statusBreakdown.pending).toBe(2);
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
  });
});
