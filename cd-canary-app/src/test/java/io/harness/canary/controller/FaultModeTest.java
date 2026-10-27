package io.harness.canary.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Locks the "running but broken" contract for v3:
 *   - POST /api/orders returns 500 (so canary verification detects it)
 *   - GET  /api/orders returns 200 (reads unaffected)
 *   - /actuator/health returns UP (Kubernetes keeps the pod Ready)
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"app.version=v3", "app.fault-mode=errors"})
class FaultModeTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void postOrdersReturnsInternalServerErrorUnderFaultMode() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerEmail": "alice@example.com",
                                  "items": [
                                    {"productName": "Widget", "quantity": 1, "unitPrice": 15.00}
                                  ]
                                }
                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void getOrdersStillWorksUnderFaultMode() throws Exception {
        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk());
    }

    @Test
    void healthEndpointStaysUpUnderFaultMode() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void readinessProbeStaysUpUnderFaultMode() throws Exception {
        mockMvc.perform(get("/actuator/health/readiness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void livenessProbeStaysUpUnderFaultMode() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
