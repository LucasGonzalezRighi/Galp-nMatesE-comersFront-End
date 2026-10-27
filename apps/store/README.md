# @galpon/store

La tienda de Galpón Mates: Next.js (App Router) con Cache Components, Tailwind v4 y TanStack Query. Con P2 es la tienda pública, conectada a la API simulada: inicio, tienda y líneas, ficha de producto, armá tu kit, carrito, buscador, nosotros, preguntas frecuentes, contacto, arrepentimiento, términos y privacidad. Con P3 suma el checkout de tres pasos, el resultado del pago, el seguimiento del pedido de invitado (`/pedido/{numero}`) y la cuenta de cliente (`/cuenta`).

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

Para probarlo:

```bash
npm run build -w @galpon/store && npm run start -w @galpon/store
curl -s localhost:3000/api/v1/categories   # las 6 líneas, en JSON
```

## Comprar en modo de prueba

En modo de prueba se compra de punta a punta sin Mercado Pago ni backend. Agregá algo al carrito y entrá a `/checkout`: Contacto, Envío y Pago. Al elegir el medio de pago en el paso 3 se confirma el pedido (`GLP-12345`) y se reserva por 30 minutos; "Pagar" solo inicia el pago. Cada camino termina en `/checkout/resultado?pedido=GLP-…`.

**Mercado Pago.** "Pagar $X con Mercado Pago" lleva al simulador `/checkout/mp-simulado` (solo existe en modo de prueba; en vivo responde 404), que muestra el pedido y el total y ofrece tres botones: **Aprobar**, **Dejar pendiente** y **Rechazar**. Cualquiera vuelve al resultado.

**Tarjeta.** Los campos de la tarjeta son simulados (nada de lo que se escribe sale del navegador) y se cargan unos instantes después de elegir la tarjeta.

| Campo              | Qué poner                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Número de tarjeta  | Cualquiera con el largo justo: 16 dígitos con 4 (Visa) o 5 (Mastercard), 15 con 34 o 37 (Amex) |
| Vencimiento        | Un mes que no pasó, `MM/AA` (por ejemplo `11/30`)                                              |
| CVC                | 3 dígitos (4 en Amex)                                                                          |
| Documento          | DNI `12345678`                                                                                 |
| Nombre del titular | Decide el resultado, como en el sandbox de Mercado Pago (tabla de abajo)                       |

| Titular | Resultado                                                                                                                                     |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `APRO`  | Aprobado                                                                                                                                      |
| `CONT`  | Pendiente                                                                                                                                     |
| `OTHE`  | Rechazado ("La tarjeta no aprobó el pago."). Cualquier otro nombre también se rechaza así                                                     |
| `FUND`  | Rechazado por fondos insuficientes                                                                                                            |
| `SECU`  | Rechazado por el código de seguridad                                                                                                          |
| `EXPI`  | Rechazado por la fecha de vencimiento                                                                                                         |
| `CALL`  | Rechazado: hay que autorizarlo con el banco                                                                                                   |
| `3DS`   | Pide la verificación 3-D Secure: el diálogo "Verificá tu compra con tu banco" abre el simulador; **Confirmar** aprueba y **Cancelar** rechaza |

Las cuotas también son simuladas: hasta 3 sin interés (CFT 0,00 %) y, además, 6 y 12 con un CFT de ejemplo de 45,90 % (TEA 38,00 %).

**Cuenta de cliente.** No hay una cuenta sembrada: registrate en `/cuenta/registro` con cualquier email (la cuenta vive en la memoria del servidor y se pierde al reiniciarlo). Con la sesión iniciada, el checkout completa el contacto y ofrece las direcciones guardadas, y el pedido aparece en `/cuenta/pedidos`. Para probar "¿Olvidaste tu contraseña?" no se manda ningún mail: pedí el enlace en `/cuenta/recuperar` y abrí `/cuenta/restablecer?token=RESET-OK` (cambia la contraseña de la última cuenta que lo pidió).

**Rutas de control.** Para armar escenarios difíciles de provocar a mano (las usan los E2E). Solo existen en modo de prueba:

```bash
# Vence ya la reserva de un pedido pendiente (libera el stock): el resultado dice "El pedido venció".
curl -X POST localhost:3000/api/v1/__mock/orders/GLP-10001/expire
# Cambia el precio o el stock de un producto: si cambia antes de elegir el medio de pago, el
# checkout responde con "Algo cambió en tu carrito" y "Confirmar de nuevo".
curl -X POST localhost:3000/api/v1/__mock/products/prd-imperial-calabaza   -H 'Content-Type: application/json' -d '{"priceArs": 26999, "stock": 20}'
```

Los E2E de compra (`e2e/store/checkout*.spec.ts` y `account.spec.ts`) recorren todos estos caminos: `npm run build && npm run test:e2e`.

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

Las lecturas del servidor son funciones `'use cache'` con `cacheTag` y `cacheLife`. Las que comparte toda la tienda (líneas, ajustes, pie) están en `src/lib/data/`; las de cada pantalla viven junto a su feature: los `features/*/*.data.ts` (inicio, tienda y producto), los `get-*-content.ts` (nosotros, preguntas frecuentes y legales) y `app/(tienda)/kit/kit-data.ts`. El backend avisa qué regenerar con `POST /api/revalidate`, con el secreto en la cabecera `x-revalidate-secret`:

```bash
curl -X POST localhost:3000/api/revalidate \
  -H 'x-revalidate-secret: dev-only-revalidate-secret-change-me-0000' \
  -H 'content-type: application/json' \
  -d '{"tags":["categories","product:mate-imperial-premium"]}'
```

- Etiquetas válidas: `products`, `categories`, `settings`, `product:{slug}`, `reviews:{slug}` y `content:{página}`.
- Secreto inválido responde 401; una etiqueta inválida, 422.
- `content:*` se regenera con el perfil `'max'` (se sirve lo anterior mientras tanto); el resto vence al instante.
- En modo de prueba, la API simulada llama a `revalidateTag` directamente después de cada escritura que cambia datos con caché (ignora las etiquetas que no cumplen el formato de arriba). Hoy ningún handler del mock invalida etiquetas: llega con las escrituras de P2–P4.

## Seguridad

`next.config.ts` agrega a todas las respuestas la política de seguridad de contenido (CSP, sección 16 del spec; en desarrollo suma `'unsafe-eval'`), `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` y `Permissions-Policy`. Con `API_MODE=live`, el origen del backend se agrega a `connect-src`.

## Estructura

```
src/
├─ app/            Layout, not-found, error, SEO (sitemap, robots, manifest) y los route handlers de /api
│  └─ (tienda)/    Las rutas públicas: inicio, tienda, tienda/[linea], producto/[slug], kit, nosotros,
│                  preguntas-frecuentes, contacto, arrepentimiento, terminos y privacidad
├─ features/       Una carpeta por pantalla o función (home, catalog, product, kit, cart, search, about,
│                  faq, contact, withdrawal, legal, reviews, toast, product-card), con sus textos
│                  (*.copy.ts), sus lecturas cacheadas (*.data.ts) y sus tests. Una feature importa a
│                  otra solo por su index.ts (lo exige el lint)
├─ components/     Piezas compartidas: layout (cabecera, pie, menú), motion (animaciones) y ui (botones,
│                  campos, precios, estrellas, diálogo)
├─ lib/            Entorno, CSP, SEO, revalidación, clientes de la API y lecturas cacheadas (lib/data)
├─ test/           Preparación de los tests
├─ types/          Declaraciones de tipos (css.d.ts)
└─ instrumentation.ts   Valida el entorno al arrancar el servidor
```

La tipografía (Inter) sale de `@fontsource-variable/inter` con `next/font/local`, así el build no necesita red.
