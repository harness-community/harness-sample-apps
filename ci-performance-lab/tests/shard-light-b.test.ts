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

describe("shard-light-b: quick status checks", () => {
  it("new order starts as pending", async () => {
    const res = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    expect(res.json().status).toBe("pending");
  });

  it("cancelled order stays cancelled", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    await app.inject({ method: "PATCH", url: `/orders/${id}/status`, payload: { status: "cancelled" } });
    const res = await app.inject({ method: "GET", url: `/orders/${id}` });
    expect(res.json().status).toBe("cancelled");
  });

  it("delete returns 204", async () => {
    const createRes = await app.inject({ method: "POST", url: "/orders", payload: sampleOrder() });
    const { id } = createRes.json();
    const res = await app.inject({ method: "DELETE", url: `/orders/${id}` });
    expect(res.statusCode).toBe(204);
  });
});
