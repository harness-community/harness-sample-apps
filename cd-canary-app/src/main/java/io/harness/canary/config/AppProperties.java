package io.harness.canary.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Runtime-tunable properties driven by env vars APP_VERSION and FAULT_MODE.
 * Spring binds "app.version" to APP_VERSION and "app.fault-mode" to FAULT_MODE
 * via relaxed property binding.
 */
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    /** Version string stamped into the response and /api/version. */
    private String version = "dev";

    /** Fault mode: "none" or "errors". Only "errors" triggers degraded behaviour. */
    private String faultMode = "none";

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getFaultMode() { return faultMode; }
    public void setFaultMode(String faultMode) { this.faultMode = faultMode; }

    public boolean isFaultModeErrors() {
        return "errors".equalsIgnoreCase(faultMode);
    }
}
