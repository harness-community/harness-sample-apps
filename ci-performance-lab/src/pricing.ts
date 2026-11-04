import { OrderItem, DISCOUNT_TIERS, TAX_RATE } from "./types.js";

export function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
}

export function calculateDiscount(items: OrderItem[]): number {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const tier = DISCOUNT_TIERS.find((t) => totalItems >= t.minItems);
  return tier ? tier.percentage / 100 : 0;
}

export function calculateTax(subtotal: number, discount: number): number {
  const discountedSubtotal = subtotal * (1 - discount);
  return Math.round(discountedSubtotal * TAX_RATE * 100) / 100;
}

export function calculateTotal(items: OrderItem[]): {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
} {
  const subtotal = calculateSubtotal(items);
  const discount = calculateDiscount(items);
  const tax = calculateTax(subtotal, discount);
  const discountedSubtotal = subtotal * (1 - discount);
  const total = Math.round((discountedSubtotal + tax) * 100) / 100;
  return { subtotal, discount, tax, total };
}
