package io.harness.demo;

public class TaxCalculator {

    private static final double TAX_RATE = 0.08;

    public double calculateTax(double amount) {
        return round(amount * TAX_RATE);
    }

    public double getTaxRate() {
        return TAX_RATE;
    }

    public double calculateTaxInclusive(double amount) {
        return round(amount + calculateTax(amount));
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
