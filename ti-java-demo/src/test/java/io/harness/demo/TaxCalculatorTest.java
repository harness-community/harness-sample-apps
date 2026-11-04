package io.harness.demo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TaxCalculatorTest {

    private TaxCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new TaxCalculator();
    }

    @Test
    void taxRateIsEightPercent() {
        assertEquals(0.08, calculator.getTaxRate());
    }

    @Test
    void calculatesTaxCorrectly() {
        assertEquals(8.0, calculator.calculateTax(100.0));
        assertEquals(4.0, calculator.calculateTax(50.0));
    }

    @Test
    void taxInclusiveAddsToAmount() {
        assertEquals(108.0, calculator.calculateTaxInclusive(100.0));
    }

    @Test
    void zeroAmountProducesZeroTax() {
        assertEquals(0.0, calculator.calculateTax(0.0));
        assertEquals(0.0, calculator.calculateTaxInclusive(0.0));
    }
}
