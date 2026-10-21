# @galpon/store

La tienda de Galpón Mates: Next.js (App Router) con Cache Components, Tailwind v4 y TanStack Query. En esta etapa (P1) es un esqueleto conectado a la API simulada; las pantallas reales llegan en P2.

## Scripts

Se corren desde `frontend/` con `-w @galpon/store` (o desde esta carpeta, sin `-w`).

| Script                               | Qué hace                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `npm run dev -w @galpon/store`       | Servidor de desarrollo en <http://localhost:3000>. `npm run dev` en la raíz levanta también el dashboard |
| `npm run build -w @galpon/store`     | Compila para producción (valida el entorno y genera las páginas estáticas)                               |
| `npm run start -w @galpon/store`     | Sirve lo compilado en <http://localhost:3000>                                                            |
| `npm run typecheck -w @galpon/store` | Genera los tipos de rutas (`next typegen`) y corre `tsc --noEmit`                                        |

## Modo de prueba

Sin ninguna variable de entorno la tienda arranca en modo de prueba (`API_MODE=mock`): no hace falta backend.

- **Servidor.** Los Server Components y las funciones `'use cache'` hablan con la API simulada de `@galpon/api-client/mock` en el mismo proceso (`src/lib/mock.server.ts`). Esas funciones corren también durante el build, por eso la base simulada vive en el mismo proceso y no detrás de una red.
- **Navegador.** Siempre habla con `/api/v1` de su propio dominio (`src/lib/api.browser.ts`). Un _rewrite_ lleva `/api/v1/*` a `/api/mock/v1/*`, un route handler que responde con la misma base simulada.
- **Latencia.** La API simulada demora entre 150 y 400 ms por pedido, como una real. `MOCK_LATENCY_MS=0` la quita.
- **Datos.** La base simulada vive en la memoria del servidor: se reinicia al reiniciar `dev` o `start`. La tienda y el dashboard no comparten datos de prueba (son procesos distintos).
- **Resultados de pago.** Se simulan por el nombre del titular, como el sandbox de Mercado Pago; la tabla está en el README de `@galpon/api-client`.

Para probarlo:

```bash
npm run build -w @galpon/store && npm run start -w @galpon/store
curl -s localhost:3000/api/v1/categories   # las 6 líneas, en JSON
```

La página de inicio (<http://localhost:3000>) es provisoria: lista las líneas con su cantidad de productos (lectura del servidor) y muestra "Descuento del kit: 10%" (lectura del navegador, a través del _rewrite_).

## Variables de entorno

`apps/store/.env.example` documenta cada variable. Se validan con `parseStoreEnv` (`src/lib/env.ts`) al cargar `next.config.ts`, así que `dev`, `build`, `start` y `typegen` fallan con un mensaje en español si algo no cierra, por ejemplo `API_MODE=live` sin `API_BASE_URL`. Para configurar algo, copiá el archivo a `apps/store/.env.local`.

| Variable                            | Modo de prueba          | En vivo                          |
| ----------------------------------- | ----------------------- | -------------------------------- |
| `API_MODE`                          | `mock` (por defecto)    | `live`                           |
| `NEXT_PUBLIC_API_MODE`              | igual a `API_MODE`      | igual a `API_MODE`               |
| `API_BASE_URL`                      | se ignora               | obligatoria, origen sin ruta     |
| `REVALIDATE_SECRET`                 | valor de desarrollo     | obligatoria, 32 caracteres o más |
| `NEXT_PUBLIC_MP_PUBLIC_KEY`         | no hace falta           | obligatoria                      |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | opcional                | opcional por ahora               |
| `NEXT_PUBLIC_SITE_URL`              | `http://localhost:3000` | el dominio público               |
| `MOCK_LATENCY_MS`                   | `150-400`               | no se usa                        |

## Pasar a vivo

Cambiar variables y volver a compilar, sin tocar código:

1. `API_MODE=live` y `NEXT_PUBLIC_API_MODE=live`.
2. `API_BASE_URL` con el origen del backend, `NEXT_PUBLIC_MP_PUBLIC_KEY` y un `REVALIDATE_SECRET` de 32 caracteres o más (el mismo que usa el backend).
3. `npm run build -w @galpon/store`: los _rewrites_ y las cabeceras de seguridad se fijan en el build, así que `API_MODE` tiene que estar definido al compilar.

En vivo, `/api/v1/*` se reescribe hacia `API_BASE_URL/api/v1/*` (mismo dominio para el navegador: sin CORS y con cookie propia) y el servidor consulta el backend directo. `/api/mock/v1` responde 404.

## Caché y revalidación

Las lecturas del servidor están en `src/lib/data/` como funciones `'use cache'` con `cacheTag` y `cacheLife`. El backend avisa qué regenerar con `POST /api/revalidate`, con el secreto en la cabecera `x-revalidate-secret`:

```bash
curl -X POST localhost:3000/api/revalidate \
  -H 'x-revalidate-secret: dev-only-revalidate-secret-change-me-0000' \
  -H 'content-type: application/json' \
  -d '{"tags":["categories","product:mate-imperial-premium"]}'
```

- Etiquetas válidas: `products`, `categories`, `settings`, `product:{slug}`, `reviews:{slug}` y `content:{página}`.
- Secreto inválido responde 401; una etiqueta inválida, 422.
- `content:*` se regenera con el perfil `'max'` (se sirve lo anterior mientras tanto); el resto vence al instante.
- En modo de prueba, la API simulada llama a `revalidateTag` directamente después de cada escritura que cambia datos con caché.

## Seguridad

`next.config.ts` agrega a todas las respuestas la política de seguridad de contenido (CSP, sección 16 del spec; en desarrollo suma `'unsafe-eval'`), `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` y `Permissions-Policy`. Con `API_MODE=live`, el origen del backend se agrega a `connect-src`.

## Estructura

```
src/
├─ app/            Rutas (layout, página de inicio provisoria, not-found) y los route handlers de /api
├─ lib/            Entorno, CSP, revalidación, clientes de la API y lecturas cacheadas (lib/data)
├─ types/          Declaraciones de tipos (css.d.ts)
└─ instrumentation.ts   Valida el entorno al arrancar el servidor
```

La tipografía (Inter) sale de `@fontsource-variable/inter` con `next/font/local`, así el build no necesita red.
