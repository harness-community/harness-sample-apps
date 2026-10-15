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

describe("shard-light-a: quick order validations", () => {
  it("rejects order with no body", async () => {
    const res = await app.inject({ method: "POST", url: "/orders", payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it("health endpoint responds", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.json().status).toBe("ok");
  });

  it("empty order list on fresh start", async () => {
    const res = await app.inject({ method: "GET", url: "/orders" });
    expect(res.json()).toHaveLength(0);
  });
});
