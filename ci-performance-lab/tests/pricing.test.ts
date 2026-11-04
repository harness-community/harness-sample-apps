import { describe, it, expect } from "vitest";
import { calculateSubtotal, calculateDiscount, calculateTax, calculateTotal } from "../src/pricing.js";

describe("pricing - subtotal", () => {
  it("sums quantity * price for each item", () => {
    const items = [
      { productId: "A", name: "A", quantity: 2, pricePerUnit: 10 },
      { productId: "B", name: "B", quantity: 3, pricePerUnit: 5 },
    ];
    expect(calculateSubtotal(items)).toBe(35);
  });

  it("returns 0 for empty items", () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  it("handles single item", () => {
    const items = [{ productId: "A", name: "A", quantity: 1, pricePerUnit: 99.99 }];
    expect(calculateSubtotal(items)).toBeCloseTo(99.99);
  });
});

describe("pricing - discount tiers", () => {
  it("returns 0 for fewer than 3 items", () => {
    const items = [{ productId: "A", name: "A", quantity: 2, pricePerUnit: 10 }];
    expect(calculateDiscount(items)).toBe(0);
  });

  it("returns 5% for 3-4 total items", () => {
    const items = [{ productId: "A", name: "A", quantity: 3, pricePerUnit: 10 }];
    expect(calculateDiscount(items)).toBe(0.05);
  });

  it("returns 10% for 5-9 total items", () => {
    const items = [{ productId: "A", name: "A", quantity: 5, pricePerUnit: 10 }];
    expect(calculateDiscount(items)).toBe(0.1);
  });

  it("returns 15% for 10+ items", () => {
    const items = [
      { productId: "A", name: "A", quantity: 7, pricePerUnit: 10 },
      { productId: "B", name: "B", quantity: 4, pricePerUnit: 5 },
    ];
    expect(calculateDiscount(items)).toBe(0.15);
  });

  it("counts across multiple line items", () => {
    const items = [
      { productId: "A", name: "A", quantity: 2, pricePerUnit: 10 },
      { productId: "B", name: "B", quantity: 2, pricePerUnit: 5 },
    ];
    expect(calculateDiscount(items)).toBe(0.05);
  });
});

describe("pricing - tax", () => {
  it("calculates 8% tax on discounted subtotal", () => {
    expect(calculateTax(100, 0.1)).toBe(7.2);
  });

  it("calculates 8% tax with no discount", () => {
    expect(calculateTax(100, 0)).toBe(8);
  });

  it("rounds to two decimal places", () => {
    expect(calculateTax(33.33, 0)).toBe(2.67);
  });
});

describe("pricing - calculateTotal end-to-end", () => {
  it("combines subtotal, discount, tax, and total correctly", () => {
    const items = [
      { productId: "A", name: "Widget", quantity: 5, pricePerUnit: 20 },
    ];
    const result = calculateTotal(items);
    expect(result.subtotal).toBe(100);
    expect(result.discount).toBe(0.1);
    expect(result.tax).toBe(7.2);
    expect(result.total).toBe(97.2);
  });

  it("handles zero-price items", () => {
    const items = [{ productId: "FREE", name: "Free Sample", quantity: 1, pricePerUnit: 0 }];
    const result = calculateTotal(items);
    expect(result.total).toBe(0);
  });
});
