# CD Canary App

A small order-processing service used to demonstrate Harness Continuous Delivery canary deployments and rollback. Built with Java 17 and Spring Boot. Three container tags (`v1`, `v2`, `v3`) share one codebase; behaviour is switched by build args and env vars.

## Three versions

| Tag | `APP_VERSION` | `FAULT_MODE` | Behaviour |
|-----|---------------|--------------|-----------|
| `v1` | `v1` | `none` | Healthy baseline. `/api/version` returns `v1`. Order responses include `versionTag: v1`. |
| `v2` | `v2` | `none` | Healthy with bulk-order discount: 10% off when pre-discount subtotal ≥ $100. Response exposes `subtotal`, `discountApplied`, `discountAmount`, `total`. |
| `v3` | `v3` | `none` | **Deliberately regressed discount eligibility check** (see section below). Returns HTTP 201 and `/actuator/health*` stays UP so Kubernetes keeps the pod Ready and canary verification is the one that catches the bug. |

## v3 deliberate regression

**v3 is intentionally wrong.** The regression was requested as part of this demo so the Harness CD canary verification stage has a realistic bug to catch. It is not an accident, not a leftover, and not an AI hallucination — the behaviour below is deliberate.

**Where it lives:** `OrderService.createOrder`. v3 evaluates discount eligibility against individual **unit prices** instead of the **extended line-item subtotal**. The subtotal itself is still computed correctly; only the eligibility check is wrong.

**Critical verification scenario (what the canary gate will exercise):**

| Field | Value |
|---|---|
| Input | `[{ productName: "Widget", quantity: 2, unitPrice: 60.00 }]` |
| Expected subtotal | `$120.00` |
| Expected discount | `$12.00` |
| Expected total | `$108.00` |
| v3 actual total | **`$120.00`** (no discount) |
| v3 HTTP status | **`201 Created`** |
| v3 liveness / readiness | **UP** |

Because v3 still returns 201 and probes stay green, Kubernetes keeps the pod Ready. Only an application-level assertion on the response body catches this — exactly the signal we want canary verification to provide.

**Why existing tests still pass under v3:** the v2 unit tests use single-unit line items at $99 / $100 / $250. Those unit prices match the eligibility outcome of the correct extended-subtotal check, so the regression is invisible to them. The gap is multi-quantity carts whose unit price is below $100 but whose line total crosses it. No existing test was removed or weakened to accommodate v3.

**FAULT_MODE is unrelated.** v3 ships with `FAULT_MODE=none`. The FAULT_MODE mechanism is retained as a separate failure switch for other experiments and is not the mechanism behind v3's regression.

## Build and test

```bash
cd cd-canary-app
mvn -B package
```

Tests include a `FaultModeTest` that locks the "errors but healthy" contract.

## Build the three images

```bash
mvn -B -DskipTests package

docker build --build-arg APP_VERSION=v1 --build-arg FAULT_MODE=none   -t cd-canary-app:v1 .
docker build --build-arg APP_VERSION=v2 --build-arg FAULT_MODE=none   -t cd-canary-app:v2 .
docker build --build-arg APP_VERSION=v3 --build-arg FAULT_MODE=none   -t cd-canary-app:v3 .
```

Push each to your registry with the matching tag. Use immutable tags only, never `:latest`.

## Local smoke test

```bash
docker run -p 8080:8080 cd-canary-app:v3
curl -s localhost:8080/api/version
# {"version":"v3","faultMode":"errors"}
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/actuator/health
# 200
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8080/api/orders \
  -H 'content-type: application/json' \
  -d '{"customerEmail":"a@b.com","items":[{"productName":"W","quantity":1,"unitPrice":1.0}]}'
# 500
```

## Kubernetes

### Harness managed manifest set

These are the files Harness should load as the Kubernetes service's manifests:

- `k8s/deployment.yaml`
- `k8s/service.yaml`
- `k8s/values.yaml`

They use Go templating (`{{.Values.*}}`). Harness renders values first (resolving expressions like `<+infra.namespace>` from the Infrastructure Definition), then Go-templates the manifests.

### Not managed by Harness

- `k8s/namespace.yaml` is an **optional provisioning asset**. The namespace must already exist in the target cluster before Harness deploys. Create it out-of-band (`kubectl apply -f k8s/namespace.yaml`, cluster bootstrap, or a one-time pipeline step), not inside the Canary application's manifest set. The namespace name must match whatever is set on the Harness Infrastructure Definition.

### Probes

`deployment.yaml` wires liveness to `/actuator/health/liveness` and readiness to `/actuator/health/readiness`. Both stay UP across v1, v2, and v3 so Kubernetes keeps v3 pods Ready while the API degrades.

### Canary verification: deterministic targeting (deferred)

A canary verification step must hit **only the canary pods**, not the primary. The current `service.yaml` selects on `app: cd-canary-app`, which would match both the stable and canary Deployments that Harness creates. Before writing the pipeline, we need to confirm:

- The exact track label Harness applies to the canary Deployment (e.g. `harness.io/track=canary`).
- Whether we add a canary-only Service that selects on that label, or have the verification step resolve canary pod names directly via `kubectl -l <track-label>`.
- Which network path the verification step uses (in-cluster Service DNS, port-forward, or a Harness delegate running inside the cluster).

A canary-only Service is intentionally **not** included at this stage. It will be added when we wire the Harness CD pipeline.

## Canary verification: pre-promotion vs post-promotion

A **failed pre-promotion canary verification** is not the same as a **rollback of an already-promoted release**.

- **Pre-promotion verification fails → no promotion.** Harness staged canary pods for the new version but has NOT shifted the stable Deployment to the new image. If verification fails, Harness aborts the pipeline, runs canary cleanup (deletes the canary pods), and leaves the stable Deployment serving 100% of traffic unchanged. Nothing to roll back; the healthy primary was never touched; users were not affected.
- **Post-promotion rollback.** If verification passed (false negative or skipped), Harness updated the Deployment to the new tag. The whole fleet is now serving the bad version. Rollback re-applies the previous manifest set and Kubernetes rolling-updates back to the known-good image. Users were affected until the rollout completed.

The v3 demo should prefer the pre-promotion path. The pipeline's canary verification step (a shell curl loop or a Harness Continuous Verification step) is what makes that path reliable.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/actuator/health` | Health check (stays UP in all three versions) |
| GET | `/actuator/health/liveness` | Kubernetes liveness probe |
| GET | `/actuator/health/readiness` | Kubernetes readiness probe |
| GET | `/api/version` | Returns `{version, faultMode}` |
| POST | `/api/orders` | Create an order (500 under `FAULT_MODE=errors`) |
| GET | `/api/orders/{id}` | Retrieve an order |
| GET | `/api/orders` | List all orders |
