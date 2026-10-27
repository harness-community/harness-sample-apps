package io.harness.canary.controller;

import io.harness.canary.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"app.version=v2", "app.fault-mode=none"})
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OrderService orderService;

    @BeforeEach
    void reset() {
        orderService.clearOrders();
    }

    @Test
    void createOrderReturns201WithVersionTag() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerEmail": "test@example.com",
                                  "items": [
                                    {"productName": "Widget", "quantity": 1, "unitPrice": 15.00}
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.customerEmail").value("test@example.com"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.total").value(15.00))
                .andExpect(jsonPath("$.versionTag").value("v2"));
    }

    @Test
    void createOrderRejectsMissingEmail() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {"productName": "Widget", "quantity": 1, "unitPrice": 10.00}
                                  ]
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createOrderRejectsInvalidEmail() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerEmail": "not-an-email",
                                  "items": [
                                    {"productName": "Widget", "quantity": 1, "unitPrice": 10.00}
                                  ]
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createOrderRejectsEmptyItems() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerEmail": "test@example.com",
                                  "items": []
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getOrderReturns404ForMissingId() throws Exception {
        mockMvc.perform(get("/api/orders/nonexistent"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value(containsString("not found")));
    }

    @Test
    void getAllOrdersReturnsEmptyListInitially() throws Exception {
        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void healthEndpointReturnsUp() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
