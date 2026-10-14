package io.harness.demo;

public class DiscountEngine {

    public double calculateDiscount(double subtotal, int totalQuantity) {
        double rate = getDiscountRate(totalQuantity);
        return round(subtotal * rate);
    }

    public double getDiscountRate(int totalQuantity) {
        if (totalQuantity >= 10) return 0.15;
        if (totalQuantity >= 5)  return 0.10;
        if (totalQuantity >= 3)  return 0.05;
        return 0.0;
    }

    public String getDiscountTier(int totalQuantity) {
        if (totalQuantity >= 10) return "BULK";
        if (totalQuantity >= 5)  return "STANDARD";
        if (totalQuantity >= 3)  return "SMALL";
        return "NONE";
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
