package io.harness.activation.service;

import io.harness.activation.exception.OrderNotFoundException;
import io.harness.activation.model.CreateOrderRequest;
import io.harness.activation.model.LineItem;
import io.harness.activation.model.Order;
import io.harness.activation.model.OrderStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OrderService {

    private final Map<String, Order> orders = new ConcurrentHashMap<>();

    public Order createOrder(CreateOrderRequest request) {
        BigDecimal total = calculateTotal(request.getItems());

        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order total must be greater than zero");
        }

        Order order = new Order(
                UUID.randomUUID().toString(),
                request.getCustomerEmail(),
                List.copyOf(request.getItems()),
                total,
                OrderStatus.PENDING,
                Instant.now()
        );

        orders.put(order.getId(), order);
        return order;
    }

    public Order getOrder(String id) {
        Order order = orders.get(id);
        if (order == null) {
            throw new OrderNotFoundException(id);
        }
        return order;
    }

    public List<Order> getAllOrders() {
        return new ArrayList<>(orders.values());
    }

    public void clearOrders() {
        orders.clear();
    }

    private BigDecimal calculateTotal(List<LineItem> items) {
        return items.stream()
                .map(LineItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
