package io.harness.activation.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class Order {

    private String id;
    private String customerEmail;
    private List<LineItem> items;
    private BigDecimal total;
    private OrderStatus status;
    private Instant createdAt;

    public Order() {}

    public Order(String id, String customerEmail, List<LineItem> items,
                 BigDecimal total, OrderStatus status, Instant createdAt) {
        this.id = id;
        this.customerEmail = customerEmail;
        this.items = items;
        this.total = total;
        this.status = status;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public List<LineItem> getItems() { return items; }
    public void setItems(List<LineItem> items) { this.items = items; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
