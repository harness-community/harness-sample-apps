package io.harness.canary.service;

import io.harness.canary.config.AppProperties;
import io.harness.canary.exception.OrderNotFoundException;
import io.harness.canary.exception.ServiceDegradedException;
import io.harness.canary.model.CreateOrderRequest;
import io.harness.canary.model.LineItem;
import io.harness.canary.model.Order;
import io.harness.canary.model.OrderStatus;
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
    private final AppProperties appProperties;

    public OrderService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public Order createOrder(CreateOrderRequest request) {
        if (appProperties.isFaultModeErrors()) {
            // Degraded on the create path only. Health, GETs are unaffected.
            throw new ServiceDegradedException("Order creation failed: upstream dependency degraded");
        }

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
        order.setVersionTag(appProperties.getVersion());

        orders.put(order.getId(), order);
        return order;
    }

    public Order getOrder(String id) {
        Order order = orders.get(id);
        if (order == null) {
            throw new OrderNotFoundException(id);
        }
        order.setVersionTag(appProperties.getVersion());
        return order;
    }

    public List<Order> getAllOrders() {
        List<Order> all = new ArrayList<>(orders.values());
        all.forEach(o -> o.setVersionTag(appProperties.getVersion()));
        return all;
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
