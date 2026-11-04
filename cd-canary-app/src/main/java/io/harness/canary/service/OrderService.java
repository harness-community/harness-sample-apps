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
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OrderService {

    static final BigDecimal DISCOUNT_THRESHOLD = new BigDecimal("100.00");
    static final BigDecimal DISCOUNT_RATE = new BigDecimal("0.10");

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

        BigDecimal subtotal = calculateTotal(request.getItems()).setScale(2, RoundingMode.HALF_UP);

        if (subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order total must be greater than zero");
        }

        // v3 regression (deliberately introduced for canary verification testing):
        // eligibility compares individual unit prices to the threshold instead of
        // the extended subtotal. Single-unit orders behave identically; multi-unit
        // orders whose line totals cross $100 but whose unit prices do not miss the
        // discount. See README "v3 deliberate regression" for the full scenario.
        boolean discountEligible = request.getItems().stream()
                .map(LineItem::getUnitPrice)
                .anyMatch(unitPrice -> unitPrice.compareTo(DISCOUNT_THRESHOLD) >= 0);
        BigDecimal discountAmount = discountEligible
                ? subtotal.multiply(DISCOUNT_RATE).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);
        BigDecimal total = subtotal.subtract(discountAmount).setScale(2, RoundingMode.HALF_UP);

        Order order = new Order(
                UUID.randomUUID().toString(),
                request.getCustomerEmail(),
                List.copyOf(request.getItems()),
                total,
                OrderStatus.PENDING,
                Instant.now()
        );
        order.setSubtotal(subtotal);
        order.setDiscountApplied(discountEligible);
        order.setDiscountAmount(discountAmount);
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
