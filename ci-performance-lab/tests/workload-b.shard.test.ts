import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp, sampleOrder } from "./helpers.js";
import type { FastifyInstance } from "fastify";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let app: FastifyInstance;

beforeEach(async () => {
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
});

describe("workload-b: concurrent operations (target ~600ms)", () => {
  it("concurrent status updates on 10 orders", async () => {
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

  it("filter by 4 customers across 20 orders", async () => {
    await delay(150);
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

  it("create and immediately delete 15 orders", async () => {
    await delay(150);
    const ids: string[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
      ids.push(res.json().id);
    }
    for (const id of ids) {
      await app.inject({ method: "DELETE", url: `/orders/${id}` });
    }
    const res = await app.inject({ method: "GET", url: "/orders" });
    expect(res.json()).toHaveLength(0);
  });

  it("summary updates after each status change", async () => {
    await delay(150);
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    for (const status of ["confirmed", "processing", "shipped"] as const) {
      await app.inject({ method: "PATCH", url: `/orders/${id}/status`, payload: { status } });
      const summary = await app.inject({ method: "GET", url: "/orders/summary" });
      expect(summary.json().statusBreakdown[status]).toBe(1);
    }
  });
});
