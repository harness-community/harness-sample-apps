# nginx:alpine ships multi-arch manifests (incl. linux/arm64), so this builds
# natively on Apple Silicon / Colima and on amd64 runners without changes.
FROM nginx:alpine

# Drop the default welcome page and ship our static index.
RUN rm -f /usr/share/nginx/html/index.html
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
