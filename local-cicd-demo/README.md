# local-cicd-demo

A minimal static site served by NGINX, used as the smallest viable workload for an end-to-end Harness CI/CD demo. The pipeline runs CI on a local Colima K3s cluster (ARM64), pushes the image to Harness Artifact Registry, and lets Harness CD roll it into the `demo` namespace.

## Layout

```
local-cicd-demo/
├── Dockerfile          # nginx:alpine (multi-arch, includes linux/arm64)
├── .dockerignore
├── index.html          # the page served at /
├── k8s/
│   ├── deployment.yaml # one replica, port 80, image placeholder
│   └── service.yaml    # ClusterIP on port 80
└── README.md
```

The build context is this directory. Do not run `docker build` from the repo root.

## Build locally (Colima / Apple Silicon)

```bash
cd local-cicd-demo
docker build -t local-cicd-demo:v1 .
```

`nginx:alpine` publishes a `linux/arm64` variant, so no `--platform` flag is needed on Apple Silicon. For a cross-arch image usable by both Colima and amd64 Harness delegates, use buildx:

```bash
docker buildx build --platform linux/arm64,linux/amd64 \
  -t local-cicd-demo:v1 .
```

## Run and test locally

```bash
docker run --rm -p 8080:80 local-cicd-demo:v1
# in another shell
curl -sS http://localhost:8080/ | head -n 5
```

You should see the page's `<!doctype html>` and the "Hello from Harness" heading.

## Deploy to local Colima K3s

```bash
kubectl create namespace demo --dry-run=client -o yaml | kubectl apply -f -
# edit k8s/deployment.yaml: replace REGISTRY_PLACEHOLDER/local-cicd-demo:v1
# with an image reachable from the cluster (either a loaded local image or a
# pushed registry tag), then:
kubectl apply -f k8s/
kubectl -n demo rollout status deploy/local-cicd-demo
kubectl -n demo port-forward svc/local-cicd-demo 8080:80
```

Open http://localhost:8080.

## Deploy via Harness

The intended production path:

1. **CI (Harness):** build the image on a Kubernetes build infrastructure backed by this Colima K3s cluster (ARM64 node pool).
2. **Push:** publish `local-cicd-demo:<TAG>` to Harness Artifact Registry.
3. **CD (Harness):** a Service references the registry via a Docker Registry connector; `k8s/deployment.yaml`'s `image:` is overridden at deploy time with `<+artifacts.primary.image>`. The Infrastructure Definition points at the `demo` namespace on the Colima cluster via a Kubernetes connector.

No credentials, tokens, or registry hostnames are committed in this directory; those live in the Harness connectors.

## Validate manifests without a cluster

```bash
# syntax + schema (needs kubectl)
kubectl apply --dry-run=client -f k8s/

# optional stricter OpenAPI validation
kubeconform -strict -summary k8s/
```
