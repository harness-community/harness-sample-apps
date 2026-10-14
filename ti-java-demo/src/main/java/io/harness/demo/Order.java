package io.harness.demo;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public class Order {

    public enum Status { PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED }

    private final String id;
    private final String customerId;
    private final List<LineItem> items;
    private Status status;

    public Order(String customerId, List<LineItem> items) {
        this.id = UUID.randomUUID().toString().substring(0, 8);
        this.customerId = customerId;
        this.items = new ArrayList<>(items);
        this.status = Status.PENDING;
    }

    public String getId() { return id; }
    public String getCustomerId() { return customerId; }
    public List<LineItem> getItems() { return Collections.unmodifiableList(items); }
    public Status getStatus() { return status; }

    public void setStatus(Status status) { this.status = status; }

    public int getTotalQuantity() {
        return items.stream().mapToInt(LineItem::getQuantity).sum();
    }

    public static class LineItem {
        private final String productId;
        private final int quantity;
        private final double unitPrice;

        public LineItem(String productId, int quantity, double unitPrice) {
            this.productId = productId;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
        }

        public String getProductId() { return productId; }
        public int getQuantity() { return quantity; }
        public double getUnitPrice() { return unitPrice; }
    }
}
