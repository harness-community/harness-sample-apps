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

describe("workload-c: validation and edge cases (target ~400ms)", () => {
  it("rejects all invalid order payloads", async () => {
    await delay(130);
    const invalid = [
      { customerId: "", items: [{ productId: "A", name: "A", quantity: 1, pricePerUnit: 10 }] },
      { customerId: "CUST-1", items: [] },
      { customerId: "CUST-1", items: [{ productId: "A", name: "A", quantity: -1, pricePerUnit: 10 }] },
      { customerId: "CUST-1", items: [{ productId: "A", name: "A", quantity: 1, pricePerUnit: -5 }] },
    ];
    for (const payload of invalid) {
      const res = await app.inject({ method: "POST", url: "/orders", payload });
      expect(res.statusCode).toBe(400);
    }
  });

  it("rejects invalid status transitions", async () => {
    await delay(130);
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const invalidStatuses = ["invalid", "unknown", "ready", ""];
    for (const status of invalidStatuses) {
      const res = await app.inject({ method: "PATCH", url: `/orders/${id}/status`, payload: { status } });
      expect(res.statusCode).toBe(400);
    }
  });

  it("404 on missing resources", async () => {
    await delay(130);
    const missing = [
      { method: "GET" as const, url: "/orders/nonexistent" },
      { method: "PATCH" as const, url: "/orders/nonexistent/status" },
      { method: "DELETE" as const, url: "/orders/nonexistent" },
    ];
    for (const req of missing) {
      const payload = req.method === "PATCH" ? { status: "confirmed" } : undefined;
      const res = await app.inject({ ...req, ...(payload && { payload }) });
      expect(res.statusCode).toBe(404);
    }
  });
});
