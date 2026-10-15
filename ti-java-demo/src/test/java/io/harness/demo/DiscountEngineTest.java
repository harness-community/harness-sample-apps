package io.harness.demo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DiscountEngineTest {

    private DiscountEngine engine;

    @BeforeEach
    void setUp() {
        engine = new DiscountEngine();
    }

    @Test
    void noDiscountForOneOrTwoItems() {
        assertEquals(0.0, engine.calculateDiscount(100.0, 1));
        assertEquals(0.0, engine.calculateDiscount(200.0, 2));
    }

    @Test
    void fivePercentDiscountForThreeToFourItems() {
        assertEquals(5.0, engine.calculateDiscount(100.0, 3));
        assertEquals(5.0, engine.calculateDiscount(100.0, 4));
    }

    @Test
    void tenPercentDiscountForFiveToNineItems() {
        assertEquals(10.0, engine.calculateDiscount(100.0, 5));
        assertEquals(10.0, engine.calculateDiscount(100.0, 9));
    }

    @Test
    void fifteenPercentDiscountForTenOrMoreItems() {
        assertEquals(15.0, engine.calculateDiscount(100.0, 10));
        assertEquals(22.5, engine.calculateDiscount(150.0, 15));
    }

    @Test
    void discountTierNames() {
        assertEquals("NONE", engine.getDiscountTier(2));
        assertEquals("SMALL", engine.getDiscountTier(3));
        assertEquals("STANDARD", engine.getDiscountTier(5));
        assertEquals("BULK", engine.getDiscountTier(10));
    }
}
