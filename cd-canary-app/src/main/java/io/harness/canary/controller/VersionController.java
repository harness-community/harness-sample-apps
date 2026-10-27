package io.harness.canary.controller;

import io.harness.canary.config.AppProperties;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Observable version signal. Pipelines, canary verification, and humans use this
 * to confirm which build is serving traffic.
 */
@RestController
@RequestMapping("/api/version")
public class VersionController {

    private final AppProperties appProperties;

    public VersionController(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @GetMapping
    public ResponseEntity<Map<String, String>> getVersion() {
        return ResponseEntity.ok(Map.of(
                "version", appProperties.getVersion(),
                "faultMode", appProperties.getFaultMode()
        ));
    }
}
