package io.harness.canary.service;

import io.harness.canary.config.AppProperties;
import io.harness.canary.exception.OrderNotFoundException;
import io.harness.canary.exception.ServiceDegradedException;
import io.harness.canary.model.CreateOrderRequest;
import io.harness.canary.model.LineItem;
import io.harness.canary.model.Order;
import io.harness.canary.model.OrderStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OrderServiceTest {

    private OrderService orderService;
    private AppProperties appProperties;

    @BeforeEach
    void setUp() {
        appProperties = new AppProperties();
        appProperties.setVersion("v1");
        appProperties.setFaultMode("none");
        orderService = new OrderService(appProperties);
    }

    @Test
    void createOrderReturnsOrderWithId() {
        CreateOrderRequest request = new CreateOrderRequest(
                "alice@example.com",
                List.of(new LineItem("Widget", 2, new BigDecimal("9.99")))
        );

        Order order = orderService.createOrder(request);

        assertNotNull(order.getId());
        assertEquals("alice@example.com", order.getCustomerEmail());
        assertEquals(OrderStatus.PENDING, order.getStatus());
        assertNotNull(order.getCreatedAt());
    }

    @Test
    void createOrderStampsVersionTag() {
        appProperties.setVersion("v2");

        Order order = orderService.createOrder(new CreateOrderRequest(
                "alice@example.com",
                List.of(new LineItem("Widget", 1, new BigDecimal("5.00")))
        ));

        assertEquals("v2", order.getVersionTag());
    }

    @Test
    void createOrderCalculatesTotalCorrectly() {
        CreateOrderRequest request = new CreateOrderRequest(
                "bob@example.com",
                List.of(
                        new LineItem("Widget", 3, new BigDecimal("10.00")),
                        new LineItem("Gadget", 1, new BigDecimal("25.50"))
                )
        );

        Order order = orderService.createOrder(request);

        assertEquals(new BigDecimal("55.50"), order.getTotal());
    }

    @Test
    void createOrderRejectsZeroTotal() {
        CreateOrderRequest request = new CreateOrderRequest(
                "carol@example.com",
                List.of(new LineItem("Free Sample", 1, BigDecimal.ZERO))
        );

        assertThrows(IllegalArgumentException.class, () -> orderService.createOrder(request));
    }

    @Test
    void createOrderThrowsWhenFaultModeErrors() {
        appProperties.setFaultMode("errors");

        CreateOrderRequest request = new CreateOrderRequest(
                "dan@example.com",
                List.of(new LineItem("Widget", 1, new BigDecimal("5.00")))
        );

        assertThrows(ServiceDegradedException.class, () -> orderService.createOrder(request));
    }

    @Test
    void getOrderReturnsCreatedOrder() {
        CreateOrderRequest request = new CreateOrderRequest(
                "dave@example.com",
                List.of(new LineItem("Bolt", 10, new BigDecimal("0.50")))
        );

        Order created = orderService.createOrder(request);
        Order retrieved = orderService.getOrder(created.getId());

        assertEquals(created.getId(), retrieved.getId());
        assertEquals("dave@example.com", retrieved.getCustomerEmail());
    }

    @Test
    void getOrderThrowsForMissingId() {
        assertThrows(OrderNotFoundException.class, () -> orderService.getOrder("nonexistent-id"));
    }

    @Test
    void getAllOrdersReturnsAllCreatedOrders() {
        orderService.createOrder(new CreateOrderRequest(
                "eve@example.com",
                List.of(new LineItem("Nut", 5, new BigDecimal("1.00")))
        ));
        orderService.createOrder(new CreateOrderRequest(
                "frank@example.com",
                List.of(new LineItem("Washer", 8, new BigDecimal("0.25")))
        ));

        assertEquals(2, orderService.getAllOrders().size());
    }

    @Test
    void clearOrdersRemovesAllOrders() {
        orderService.createOrder(new CreateOrderRequest(
                "grace@example.com",
                List.of(new LineItem("Spring", 1, new BigDecimal("3.00")))
        ));

        orderService.clearOrders();

        assertTrue(orderService.getAllOrders().isEmpty());
    }

    @Test
    void discountNotAppliedAt99() {
        Order order = orderService.createOrder(new CreateOrderRequest(
                "shopper@example.com",
                List.of(new LineItem("Widget", 1, new BigDecimal("99.00")))
        ));

        assertEquals(new BigDecimal("99.00"), order.getSubtotal());
        assertEquals(Boolean.FALSE, order.getDiscountApplied());
        assertEquals(new BigDecimal("0.00"), order.getDiscountAmount());
        assertEquals(new BigDecimal("99.00"), order.getTotal());
    }

    @Test
    void discountAppliedAtExactly100() {
        Order order = orderService.createOrder(new CreateOrderRequest(
                "shopper@example.com",
                List.of(new LineItem("Widget", 1, new BigDecimal("100.00")))
        ));

        assertEquals(new BigDecimal("100.00"), order.getSubtotal());
        assertEquals(Boolean.TRUE, order.getDiscountApplied());
        assertEquals(new BigDecimal("10.00"), order.getDiscountAmount());
        assertEquals(new BigDecimal("90.00"), order.getTotal());
    }

    @Test
    void discountAppliedAt250() {
        Order order = orderService.createOrder(new CreateOrderRequest(
                "shopper@example.com",
                List.of(new LineItem("Widget", 1, new BigDecimal("250.00")))
        ));

        assertEquals(new BigDecimal("250.00"), order.getSubtotal());
        assertEquals(Boolean.TRUE, order.getDiscountApplied());
        assertEquals(new BigDecimal("25.00"), order.getDiscountAmount());
        assertEquals(new BigDecimal("225.00"), order.getTotal());
    }

    @Test
    void multipleOrdersGetUniqueIds() {
        CreateOrderRequest request = new CreateOrderRequest(
                "iris@example.com",
                List.of(new LineItem("Pin", 1, new BigDecimal("2.00")))
        );

        Order first = orderService.createOrder(request);
        Order second = orderService.createOrder(request);

        assertNotEquals(first.getId(), second.getId());
    }
}
