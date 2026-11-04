import { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { CreateOrderRequest, UpdateStatusRequest, Order } from "./types.js";
import { calculateTotal } from "./pricing.js";
import * as store from "./store.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  app.post<{ Body: CreateOrderRequest }>("/orders", async (request, reply) => {
    const { customerId, items } = request.body;

    if (!customerId || !items?.length) {
      return reply.status(400).send({ error: "customerId and at least one item are required" });
    }

    for (const item of items) {
      if (item.quantity <= 0 || item.pricePerUnit < 0) {
        return reply.status(400).send({ error: "quantity must be positive and price non-negative" });
      }
    }

    const { subtotal, tax, total } = calculateTotal(items);
    const now = new Date().toISOString();

    const order: Order = {
      id: nanoid(12),
      customerId,
      items,
      status: "pending",
      subtotal,
      tax,
      total,
      createdAt: now,
      updatedAt: now,
    };

    store.addOrder(order);
    return reply.status(201).send(order);
  });

  app.get<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
    const order = store.getOrder(request.params.id);
    if (!order) return reply.status(404).send({ error: "Order not found" });
    return order;
  });

  app.get("/orders", async (request) => {
    const { customerId } = request.query as { customerId?: string };
    if (customerId) return store.getOrdersByCustomer(customerId);
    return store.getAllOrders();
  });

  app.patch<{ Params: { id: string }; Body: UpdateStatusRequest }>(
    "/orders/:id/status",
    async (request, reply) => {
      const { status } = request.body;
      const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
      if (!validStatuses.includes(status)) {
        return reply.status(400).send({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }
      const order = store.updateOrderStatus(request.params.id, status);
      if (!order) return reply.status(404).send({ error: "Order not found" });
      return order;
    },
  );

  app.delete<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
    const deleted = store.deleteOrder(request.params.id);
    if (!deleted) return reply.status(404).send({ error: "Order not found" });
    return reply.status(204).send();
  });

  app.get("/orders/summary", async () => store.getOrderSummary());
}
