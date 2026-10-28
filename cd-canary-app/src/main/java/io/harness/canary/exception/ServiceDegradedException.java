package io.harness.canary.exception;

/**
 * Thrown by OrderService when FAULT_MODE=errors is active.
 * Scoped to the create path only. Does NOT affect actuator health,
 * so the pod stays Ready while the API degrades.
 */
public class ServiceDegradedException extends RuntimeException {

    public ServiceDegradedException(String message) {
        super(message);
    }
}
