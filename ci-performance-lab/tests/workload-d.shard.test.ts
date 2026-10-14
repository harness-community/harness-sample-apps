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

describe("workload-d: discount and pricing (target ~300ms)", () => {
  it("no discount for small orders", async () => {
    await delay(100);
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: { customerId: "CUST-1", items: [{ productId: "A", name: "A", quantity: 2, pricePerUnit: 50 }] },
    });
    const body = res.json();
    expect(body.subtotal).toBe(100);
    expect(body.tax).toBe(8);
    expect(body.total).toBe(108);
  });

  it("5% discount for 3-4 items", async () => {
    await delay(100);
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: { customerId: "CUST-1", items: [{ productId: "A", name: "A", quantity: 4, pricePerUnit: 25 }] },
    });
    const body = res.json();
    expect(body.subtotal).toBe(100);
    expect(body.total).toBeLessThan(108);
  });

  it("10% discount for 5-9 items", async () => {
    await delay(100);
    const res = await app.inject({
      method: "POST",
      url: "/orders",
      payload: { customerId: "CUST-1", items: [{ productId: "A", name: "A", quantity: 7, pricePerUnit: 10 }] },
    });
    const body = res.json();
    expect(body.subtotal).toBe(70);
    expect(body.total).toBeCloseTo(68.04, 1);
  });
});
