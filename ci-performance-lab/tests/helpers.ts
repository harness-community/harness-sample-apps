import { buildApp } from "../src/app.js";
import { clearOrders } from "../src/store.js";
import type { FastifyInstance } from "fastify";

export async function createTestApp(): Promise<FastifyInstance> {
  clearOrders();
  const app = await buildApp();
  return app;
}

export function sampleItems(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    productId: `PROD-${i + 1}`,
    name: `Product ${i + 1}`,
    quantity: i + 1,
    pricePerUnit: 10 + i * 5,
  }));
}

export function sampleOrder(overrides = {}) {
  return {
    customerId: "CUST-001",
    items: sampleItems(),
    ...overrides,
  };
}
