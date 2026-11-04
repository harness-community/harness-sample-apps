import { Order, OrderStatus, OrderSummary } from "./types.js";

const orders = new Map<string, Order>();

export function addOrder(order: Order): void {
  orders.set(order.id, order);
}

export function getOrder(id: string): Order | undefined {
  return orders.get(id);
}

export function getAllOrders(): Order[] {
  return Array.from(orders.values());
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  orders.set(id, order);
  return order;
}

export function deleteOrder(id: string): boolean {
  return orders.delete(id);
}

export function getOrdersByCustomer(customerId: string): Order[] {
  return getAllOrders().filter((o) => o.customerId === customerId);
}

export function getOrderSummary(): OrderSummary {
  const all = getAllOrders();
  const totalRevenue = all.reduce((sum, o) => sum + o.total, 0);
  const statusBreakdown = {} as Record<OrderStatus, number>;
  for (const o of all) {
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
  }
  return {
    totalOrders: all.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageOrderValue: all.length ? Math.round((totalRevenue / all.length) * 100) / 100 : 0,
    statusBreakdown,
  };
}

export function clearOrders(): void {
  orders.clear();
}
