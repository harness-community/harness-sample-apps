package io.harness.demo;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class OrderService {

    private final DiscountEngine discountEngine;
    private final TaxCalculator taxCalculator;
    private final Map<String, Order> orders = new HashMap<>();

    public OrderService(DiscountEngine discountEngine, TaxCalculator taxCalculator) {
        this.discountEngine = discountEngine;
        this.taxCalculator = taxCalculator;
    }

    public Order createOrder(String customerId, List<Order.LineItem> items) {
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("customerId is required");
        }
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("at least one item is required");
        }
        Order order = new Order(customerId, items);
        orders.put(order.getId(), order);
        return order;
    }

    public Order getOrder(String orderId) {
        Order order = orders.get(orderId);
        if (order == null) {
            throw new IllegalArgumentException("order not found: " + orderId);
        }
        return order;
    }

    public List<Order> getOrdersByCustomer(String customerId) {
        return orders.values().stream()
                .filter(o -> o.getCustomerId().equals(customerId))
                .collect(Collectors.toList());
    }

    public void updateStatus(String orderId, Order.Status newStatus) {
        Order order = getOrder(orderId);
        order.setStatus(newStatus);
    }

    public void deleteOrder(String orderId) {
        if (orders.remove(orderId) == null) {
            throw new IllegalArgumentException("order not found: " + orderId);
        }
    }

    public double calculateSubtotal(Order order) {
        return order.getItems().stream()
                .mapToDouble(item -> item.getQuantity() * item.getUnitPrice())
                .sum();
    }

    public double calculateTotal(Order order) {
        double subtotal = calculateSubtotal(order);
        double discount = discountEngine.calculateDiscount(subtotal, order.getTotalQuantity());
        double afterDiscount = subtotal - discount;
        double tax = taxCalculator.calculateTax(afterDiscount);
        return Math.round((afterDiscount + tax) * 100.0) / 100.0;
    }

    public int getOrderCount() {
        return orders.size();
    }

    public void clear() {
        orders.clear();
    }
}
