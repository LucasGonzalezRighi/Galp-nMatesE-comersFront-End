# syntax=docker/dockerfile:1

# Imagen del dashboard (Vite). El contexto es la raíz del repo del front (es un monorepo):
#   docker build -f apps/admin/Dockerfile \
#     --build-arg VITE_API_BASE_URL=https://api.tudominio.com.ar \
#     --build-arg VITE_STORE_URL=https://tudominio.com.ar -t galpon-admin .
# La usa `backend/deploy/docker-compose.yml`.
#
# El dashboard se compila al construir la imagen (las `VITE_*` quedan fijas en los archivos) y lo
# sirve un Caddy interno: archivos estáticos, `index.html` para cualquier ruta y las cabeceras de
# seguridad de `src/lib/csp.ts`. El HTTPS y `Strict-Transport-Security` los pone el proxy de entrada.

# Solo los `package.json` y la lockfile: mientras no cambien, `npm ci` sale de la caché de Docker.
FROM node:22-bookworm-slim AS manifests
WORKDIR /src
COPY . .
RUN find . -type f ! -name package.json ! -name package-lock.json -delete \
  && find . -type d -empty -delete

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN chown node:node /app
USER node
COPY --from=manifests --chown=node:node /src ./
# `prepare` instala los hooks de git (lefthook) y en la imagen no hay repositorio: se quita.
RUN npm pkg delete scripts.prepare && npm ci --no-audit --no-fund
COPY --chown=node:node . .

FROM deps AS build
# Origen del back (sin `/api/v1`) y de la tienda, tal como los ve el navegador.
ARG VITE_API_BASE_URL
ARG VITE_STORE_URL
ENV VITE_API_MODE=live
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STORE_URL=$VITE_STORE_URL
RUN test -n "$VITE_API_BASE_URL" && test -n "$VITE_STORE_URL" \
  || { echo "Faltan los build args VITE_API_BASE_URL y VITE_STORE_URL" >&2; exit 1; }
RUN npm run build -w @galpon/admin \
  && node scripts/admin-caddy-headers.mjs "$VITE_API_BASE_URL" > /tmp/cabeceras.caddy

FROM caddy:2-alpine AS admin
COPY apps/admin/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /tmp/cabeceras.caddy /etc/caddy/cabeceras.caddy
COPY --from=build /app/apps/admin/dist /srv
EXPOSE 80
