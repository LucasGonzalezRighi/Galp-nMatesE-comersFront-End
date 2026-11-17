# syntax=docker/dockerfile:1

# Imagen de la tienda (Next.js). El contexto es la raíz del repo del front (es un monorepo):
#   docker build -f apps/store/Dockerfile -t galpon-store .
# La usa `backend/deploy/docker-compose.yml`.
#
# La imagen trae el código y las dependencias, pero NO la tienda compilada: `next build` lee el
# catálogo del back y deja fijos el rewrite de `/api/v1`, la CSP y las variables `NEXT_PUBLIC_*`,
# así que se compila al arrancar el contenedor, con el back ya levantado y el entorno real
# (ver `docker-entrypoint.sh`).

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

FROM deps AS store
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["sh", "apps/store/docker-entrypoint.sh"]
