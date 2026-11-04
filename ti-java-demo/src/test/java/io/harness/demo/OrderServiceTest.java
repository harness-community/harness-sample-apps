package io.harness.demo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OrderServiceTest {

    private OrderService service;

    @BeforeEach
    void setUp() {
        service = new OrderService(new DiscountEngine(), new TaxCalculator());
    }

    @Test
    void createOrderReturnsOrderWithId() {
        Order order = service.createOrder("cust-1", List.of(
                new Order.LineItem("SKU-A", 2, 25.0)));
        assertNotNull(order.getId());
        assertEquals("cust-1", order.getCustomerId());
        assertEquals(Order.Status.PENDING, order.getStatus());
    }

    @Test
    void getOrderRetrievesCreatedOrder() {
        Order created = service.createOrder("cust-1", List.of(
                new Order.LineItem("SKU-A", 1, 10.0)));
        Order retrieved = service.getOrder(created.getId());
        assertEquals(created.getId(), retrieved.getId());
    }

    @Test
    void getOrdersByCustomerFiltersCorrectly() {
        service.createOrder("cust-1", List.of(new Order.LineItem("SKU-A", 1, 10.0)));
        service.createOrder("cust-2", List.of(new Order.LineItem("SKU-B", 1, 20.0)));
        service.createOrder("cust-1", List.of(new Order.LineItem("SKU-C", 1, 30.0)));

        List<Order> result = service.getOrdersByCustomer("cust-1");
        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(o -> o.getCustomerId().equals("cust-1")));
    }

    @Test
    void updateStatusChangesOrderState() {
        Order order = service.createOrder("cust-1", List.of(
                new Order.LineItem("SKU-A", 1, 10.0)));
        service.updateStatus(order.getId(), Order.Status.CONFIRMED);
        assertEquals(Order.Status.CONFIRMED, service.getOrder(order.getId()).getStatus());
    }

    @Test
    void deleteOrderRemovesIt() {
        Order order = service.createOrder("cust-1", List.of(
                new Order.LineItem("SKU-A", 1, 10.0)));
        assertEquals(1, service.getOrderCount());
        service.deleteOrder(order.getId());
        assertEquals(0, service.getOrderCount());
    }

    @Test
    void deleteNonexistentOrderThrows() {
        assertThrows(IllegalArgumentException.class, () -> service.deleteOrder("bogus"));
    }

    @Test
    void createOrderWithNoItemsThrows() {
        assertThrows(IllegalArgumentException.class, () ->
                service.createOrder("cust-1", List.of()));
    }

    @Test
    void createOrderWithBlankCustomerThrows() {
        assertThrows(IllegalArgumentException.class, () ->
                service.createOrder("", List.of(new Order.LineItem("SKU-A", 1, 10.0))));
    }

    @Test
    void calculateSubtotalSumsLineItems() {
        Order order = service.createOrder("cust-1", List.of(
                new Order.LineItem("SKU-A", 2, 25.0),
                new Order.LineItem("SKU-B", 3, 10.0)));
        assertEquals(80.0, service.calculateSubtotal(order));
    }

    @Test
    void calculateTotalAppliesDiscountAndTax() {
        // 10 items at $10 = $100 subtotal, 15% discount = $85, 8% tax = $6.80, total = $91.80
        Order order = service.createOrder("cust-1", List.of(
                new Order.LineItem("SKU-A", 10, 10.0)));
        assertEquals(91.80, service.calculateTotal(order));
    }

    @Test
    void calculateTotalWithNoDiscount() {
        // 1 item at $50 = $50 subtotal, 0% discount, 8% tax = $4, total = $54
        Order order = service.createOrder("cust-1", List.of(
                new Order.LineItem("SKU-A", 1, 50.0)));
        assertEquals(54.0, service.calculateTotal(order));
    }

    @Test
    void clearRemovesAllOrders() {
        service.createOrder("cust-1", List.of(new Order.LineItem("SKU-A", 1, 10.0)));
        service.createOrder("cust-2", List.of(new Order.LineItem("SKU-B", 1, 20.0)));
        assertEquals(2, service.getOrderCount());
        service.clear();
        assertEquals(0, service.getOrderCount());
    }
}
