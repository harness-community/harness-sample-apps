package io.harness.canary.controller;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.AnnotationConfigServletWebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;

import io.harness.canary.Application;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProbeMatrixTest {

    @ParameterizedTest(name = "APP_VERSION={0} FAULT_MODE={1} → probes 200")
    @CsvSource({
            "v1, none",
            "v2, none",
            "v3, errors"
    })
    void allProbesReturn200(String version, String faultMode) throws Exception {
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(Application.class)
                .properties(
                        "server.port=0",
                        "app.version=" + version,
                        "app.fault-mode=" + faultMode
                )
                .run()) {
            int port = ((AnnotationConfigServletWebServerApplicationContext) ctx)
                    .getWebServer().getPort();
            HttpClient client = HttpClient.newHttpClient();
            for (String path : new String[]{"/actuator/health", "/actuator/health/liveness", "/actuator/health/readiness"}) {
                HttpResponse<String> r = client.send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build(),
                        HttpResponse.BodyHandlers.ofString());
                assertEquals(200, r.statusCode(),
                        "version=" + version + " faultMode=" + faultMode + " path=" + path
                                + " body=" + r.body());
            }
        }
    }
}
