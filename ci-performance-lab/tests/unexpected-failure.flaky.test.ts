import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../src/app.js";
import { clearOrders } from "../src/store.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeEach(async () => {
  clearOrders();
  app = await buildApp();
});

afterEach(async () => {
  await app.close();
});

describe("unexpected failure - not quarantined", () => {
  it("health endpoint responds within an impossible 0ms budget", async () => {
    const start = performance.now();
    await app.inject({ method: "GET", url: "/health" });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(0);
  });
});
