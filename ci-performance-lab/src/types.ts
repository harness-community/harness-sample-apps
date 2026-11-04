export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export interface CreateOrderRequest {
  customerId: string;
  items: OrderItem[];
}

export interface UpdateStatusRequest {
  status: OrderStatus;
}

export interface OrderSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusBreakdown: Record<OrderStatus, number>;
}

export interface DiscountRule {
  minItems: number;
  percentage: number;
}

export const DISCOUNT_TIERS: DiscountRule[] = [
  { minItems: 10, percentage: 15 },
  { minItems: 5, percentage: 10 },
  { minItems: 3, percentage: 5 },
];

export const TAX_RATE = 0.08;
