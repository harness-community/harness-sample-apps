package io.harness.activation.service;

import io.harness.activation.exception.OrderNotFoundException;
import io.harness.activation.model.CreateOrderRequest;
import io.harness.activation.model.LineItem;
import io.harness.activation.model.Order;
import io.harness.activation.model.OrderStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OrderServiceTest {

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService();
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
    void createOrderPreservesItemDetails() {
        LineItem item = new LineItem("Precision Gear", 4, new BigDecimal("12.75"));
        CreateOrderRequest request = new CreateOrderRequest("hank@example.com", List.of(item));

        Order order = orderService.createOrder(request);

        assertEquals(1, order.getItems().size());
        assertEquals("Precision Gear", order.getItems().get(0).getProductName());
        assertEquals(4, order.getItems().get(0).getQuantity());
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
