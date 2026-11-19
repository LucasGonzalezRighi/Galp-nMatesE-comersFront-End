# @galpon/store

La tienda de Galpón Mates: Next.js (App Router) con Cache Components, Tailwind v4 y TanStack Query. Con P2 es la tienda pública, conectada a la API simulada: inicio, tienda y líneas, ficha de producto, armá tu kit, carrito, buscador, nosotros, preguntas frecuentes, contacto, arrepentimiento, términos y privacidad. Con P3 suma el checkout de tres pasos, el resultado del pago, el seguimiento del pedido de invitado (`/pedido/{numero}`) y la cuenta de cliente (`/cuenta`).

## Scripts

Se corren desde `frontend/` con `-w @galpon/store` (o desde esta carpeta, sin `-w`).

| Script                               | Qué hace                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `npm run dev -w @galpon/store`       | Servidor de desarrollo en <http://localhost:3000>. `npm run dev` en la raíz levanta también el dashboard |
| `npm run build -w @galpon/store`     | Compila para producción (valida el entorno y genera las páginas estáticas)                               |
| `npm run start -w @galpon/store`     | Sirve lo compilado en <http://localhost:3000> (o en `$PORT`, si está definida)                           |
| `npm run typecheck -w @galpon/store` | Genera los tipos de rutas (`next typegen`) y corre `tsc --noEmit`                                        |

## Modo de prueba

Sin ninguna variable de entorno la tienda arranca en modo de prueba (`API_MODE=mock`): no hace falta backend.

- **Servidor.** Los Server Components y las funciones `'use cache'` hablan con la API simulada de `@galpon/api-client/mock` en el mismo proceso (`src/lib/mock.server.ts`). Esas funciones corren también durante el build, por eso la base simulada vive en el mismo proceso y no detrás de una red.
- **Navegador.** Siempre habla con `/api/v1` de su propio dominio (`src/lib/api.browser.ts`). Un _rewrite_ lleva `/api/v1/*` a `/api/mock/v1/*`, un route handler que responde con la misma base simulada.
- **Latencia.** La API simulada demora 150 ms por pedido (el mínimo de `MOCK_LATENCY_MS`, fija en el proceso de Next porque `Math.random()` es un valor inestable para el prerender de Cache Components; el admin sí usa el rango). `MOCK_LATENCY_MS=0` la quita.
- **Datos.** La base simulada vive en la memoria del servidor: se reinicia al reiniciar `dev` o `start`. La tienda y el dashboard no comparten datos de prueba (son procesos distintos). Es una sola para todos los que visitan la tienda, así que cada colección que crece con pedidos de visitantes tiene un tope y descarta lo más viejo (`MOCK_DB_LIMITS`: sesiones, clientes, pedidos, mensajes, reseñas pendientes…; el detalle, en el README de `@galpon/api-client`), y cada cuerpo se lee hasta 64 kB (`413` si pasa).
- **Fotos.** Las del catálogo de prueba están en `public/mock-images/`, con el slug del producto como nombre: 16 productos tienen (el detalle, en el README de `@galpon/api-client`) y el resto muestra el marco punteado. El admin tiene la misma copia en su `public/`.
- **Mate 3D del inicio.** La escena de three.js está en `src/features/home/mate3d/` (su README explica los módulos de `scene/`, el estado, los momentos y cómo ajustar un keyframe, la pared de la montañita y el chorro) y la monta `MateStage`. Sus texturas están en `public/hero/3d/` (el interior curado, el frente del paquete de Canarias y `yerba-albedo.jpg`, la foto real de la yerba) y las fotos de fondo de las tres paradas, nítidas y apenas oscurecidas, en `public/hero/world/` (`pieces.jpg`, que también es el respaldo sin WebGL, `bombilla.jpg` y `ritual.jpg`). El yerbal del Manifiesto es `public/hero/world/yerbal.jpg`. `MateStage` baja aparte (`next/dynamic` sin SSR), así three.js no llega al celular.
- **Portada donde no hay mate 3D** (Ruling IC-8). En el celular, la tableta, las ventanas de menos de 700 px de alto, con menos movimiento o si al contenido le falta una de las dos escenas, el inicio arranca con la portada del v4 (`HeroCarousel`): "Encontrá tu mate." y cinco piezas apiladas (`heroSlides`: la del hero, dos bombillas, una yerba y otro mate destacado) que se cambian con las flechas, los puntos o deslizando más de 50 px, sin avance solo. Debajo de 768 px la pila es plana; desde 768 px gira como en el v4. El servidor siempre dibuja esta portada: en escritorio con 3D la tapan la tapa del servidor y la intro hasta que se monta `MateStage` (si el 3D todavía no bajó se ve un fondo liso, nunca el carrusel).
- **Carruseles con flechas** (Ruling IC-9). "Categorías" (antes "Seis líneas para cada ronda"; el título es contenido, Ruling AT-4) y los combos usan `ArrowCarousel` (`components/ui`): una fila nativa con `scroll-snap` que el dedo y el trackpad deslizan y la rueda no secuestra (baja la página), flechas de 46 px que la corren de a una tarjeta y dan la vuelta en los extremos, contador "01 / 07" y una región viva que anuncia la posición solo después de tocar una flecha. Con Tab la fila se corre sola hasta la tarjeta enfocada. "Categorías" entra por tiempo al verse (`CollectionEntrance`, Ruling AT-1): el título sube con máscara y las tarjetas suben de a una, solo con `transform` y `opacity`; en escritorio con 3D se solapa 70 svh con el escenario y entra en el mismo gesto del pase del mate, y con menos movimiento queda quieta. La barra de arrepentimiento de arriba del encabezado ya no está (Ruling IC-1): el link va solo en el pie.
- **Combos** (Rulings IC-11 e IC-12). `getCombos()` (`lib/data/combos.ts`, etiquetas `combos` y `products`) trae los publicados; "Combos listos para cebar" (`HomeCombos`) va entre las líneas y los destacados, con hasta 6 por `position`: grilla de hasta 3 desde 768 px y carrusel con más o en el celular. Sin combos no se dibuja, y si `GET /combos` falla el inicio sigue sin la sección. `ComboCard` (`features/combo-card`) agrega con `addComboToCart`: el cuero elegido entre los que ofrece el mate del combo (`comboMateLeathers`; sin cueros, sin selector ni `options`), el tope de stock compartido con las demás líneas del carrito y el aviso con el vuelo, sin abrir el carrito. En el carrito, el checkout, el resultado y la cuenta el combo es una línea propia con sus piezas, y el renglón de totales dice "Ahorro" (junta el del kit y el de los combos). Los fixtures son los de la Ruling IC-14 (cuatro publicados y un borrador).
- **Grillas de productos** (Ruling AT-2). Una sola `ProductGrid` (`features/product-card`) mide las columnas, muestra unas hileras y despliega el resto con "Ver más productos" (`PRODUCT_CARD_COPY.moreProducts`), con el foco en la primera tarjeta nueva y `<noscript>` con todas. La usan la tienda (`CatalogGrid`: 4 hileras, 5 columnas antes de medir), los relacionados de la ficha (`RelatedProducts`, "Más para la ronda": 3 hileras, hasta 30 productos de `GET /products/{slug}/related`) y "Los más vendidos" del inicio (`FeaturedGrid`: solo con una columna, en el celular, 3 tarjetas y el botón; desde tableta, todas y sin botón). La tienda y los relacionados van en `shop-container` (`--shop-max: 1424px` en `globals.css`): las tarjetas tienen el mismo tamaño de siempre y desde 1616 px entran 5 por hilera en un contenedor más angosto que el del sitio, con el título, las líneas y el buscador alineados con la grilla. Es una excepción acotada a esas grillas de tarjetas: el encabezado, el pie y el resto del sitio siguen en `site-container` (el contenedor único de la Ruling MR-11).
- **Cueros por producto** (Ruling AT-5). Cada producto trae `leathers` (de 0 a 4; solo los mates). La ficha muestra una muestra por cuero ofrecido (con uno solo, la muestra sola; sin cueros, sin selector) y el kit y los combos, los del mate. No hay virola: va en la descripción. El carrito manda `options: { leather }` (o `leather` en el kit) solo si el producto o el mate ofrece cueros, y si no `null`; las claves son `product:{id}:{cuero|-}`, `kit:{mate}:{bombilla}:{yerba}:{cuero|-}` y `combo:{id}:{cuero|-}`. Al conciliar, un cuero que ya no se ofrece pasa al primero ofrecido y avisa "Cambiamos el color de {producto} a {cuero}" (sin cueros, se quita en silencio). Las líneas de los pedidos muestran el `detail` del back tal cual (los pedidos anteriores conservan la virola).
- **Efectos del resto del inicio.** Ligados al scroll con `useScroll` de `motion/react` y solo en escritorio con movimiento: la salida de Destacados (`FeaturedExit`), el yerbal del Manifiesto que se enciende al entrar (`ManifestoBackdrop`) y su texto que sube (`ManifestoEnter`), el Manifiesto con la banda de cifras clavados y el kit que sube por encima (`PinnedManifesto`; las cifras cuentan de 0 al quedar enteras a la vista, `StatsBand`), las reseñas pegadas sobre el mate (`ReviewsCollage`: la foto del mate en recortes que se acomodan al aparecer y la nota de cada cliente clavada con un hilo a la parte que nombra, ver `mate-parts.ts`) y el pie que sube por encima de las reseñas quietas como el del portafolio de Lucas (`FooterStage`, `FooterRise`, `footer.css`), con GALPÓN en ola (`FooterWordmark`) cortada a la mitad de sus letras por el final de la página. El inicio marca `<html>` con `data-footer-rise` y `data-footer-home` desde sus efectos: con Cache Components el inicio queda oculto en el documento al navegar a otra página, así que nada del pie depende de un `:has()` sobre su DOM. En las demás páginas el pie es sutil y va al final (filas con fundido, GALPÓN apagada).

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

**Cuenta de cliente.** No hay una cuenta sembrada: registrate en `/cuenta/registro` con cualquier email (la cuenta vive en la memoria del servidor y se pierde al reiniciarlo). Con la sesión iniciada, el checkout completa el contacto y ofrece las direcciones guardadas, y el pedido aparece en `/cuenta/pedidos`. Para probar "¿Olvidaste tu contraseña?" no se manda ningún mail: pedí el enlace en `/cuenta/recuperar` y la tienda escribe en su log (la terminal de `dev` o `start`) la línea `[modo de prueba] Enlace para cambiar la contraseña de …` con el enlace. Como en el back, el token es al azar, sirve una sola vez, vence a los 60 minutos y un pedido nuevo anula el anterior.

**Rutas de control.** Para armar escenarios difíciles de provocar a mano (las usan los E2E). Solo existen en modo de prueba y, como no piden sesión, en producción (`next start`) responden 404 salvo que la tienda tenga `MOCK_CONTROL_SECRET` y el pedido traiga ese secreto en `X-Mock-Control-Secret` (los E2E lo mandan solos). Con `npm run dev` andan sin secreto:

```bash
# Vence ya la reserva de un pedido pendiente (libera el stock): el resultado dice "El pedido venció".
curl -X POST localhost:3000/api/v1/__mock/orders/GLP-10001/expire
# Cambia el precio o el stock de un producto: si cambia antes de elegir el medio de pago, el
# checkout responde con "Algo cambió en tu carrito" y "Confirmar de nuevo".
curl -X POST localhost:3000/api/v1/__mock/products/prd-imperial-calabaza   -H 'Content-Type: application/json' -d '{"priceArs": 26999, "stock": 20}'
# Contra `next start` con MOCK_CONTROL_SECRET, los dos llevan además el secreto:
#   -H "X-Mock-Control-Secret: $MOCK_CONTROL_SECRET"
```

**Admin de la API simulada.** Las rutas `/api/v1/admin/*` de la tienda escriben en la base del servidor (sirve, por ejemplo, para crear un combo y verlo en el inicio). El login (`POST /api/v1/admin/auth/login`) usa la cuenta de fábrica del README raíz solo fuera de producción; en producción, solo la contraseña de `MOCK_ADMIN_PASSWORD` (sin ella, el admin queda cerrado). Como en el back, la sesión va en la cookie `galpon_admin` que pone el login (otro ingreso la reemplaza) y cada escritura lleva además `X-CSRF-Token`. Con `curl`, guardá la cookie con `-c` y mandala con `-b`:

```bash
curl -c admin.txt -X POST localhost:3000/api/v1/admin/auth/login -H 'Content-Type: application/json' -d '{"email":"…","password":"…"}'
curl -b admin.txt localhost:3000/api/v1/admin/orders
```

Los E2E de compra (`e2e/store/checkout*.spec.ts` y `account.spec.ts`) recorren todos estos caminos: `npm run build && npm run test:e2e`.

## Variables de entorno

`apps/store/.env.example` documenta cada variable. Se validan con `parseStoreEnv` (`src/lib/env.ts`) al cargar `next.config.ts`, así que `dev`, `build`, `start` y `typegen` fallan con un mensaje en español si algo no cierra, por ejemplo `API_MODE=live` sin `API_BASE_URL`. Para configurar algo, copiá el archivo a `apps/store/.env.local`.

**En producción** (`next build` y `next start`, que corren con `NODE_ENV=production`) `API_MODE` es obligatoria: sin ella la tienda no arranca, con un mensaje que lo dice. `API_MODE=mock` en producción solo pasa con `MOCK_ALLOWED_IN_PRODUCTION=true`, y al arrancar avisa en el log que es inseguro: la API simulada no tiene autenticación real y todos los que la visitan comparten una sola base. Ahí su admin solo abre con `MOCK_ADMIN_PASSWORD` y sus rutas de control solo con `MOCK_CONTROL_SECRET`. Es para las pruebas de punta a punta (`playwright.config.ts` y el CI la ponen); nunca en un sitio público. `next typegen` (`npm run typecheck`) no la exige.

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
| `MOCK_ALLOWED_IN_PRODUCTION`        | `true` solo en los E2E  | no se usa                        |
| `MOCK_ADMIN_PASSWORD`               | opcional                | se ignora                        |
| `MOCK_CONTROL_SECRET`               | los E2E                 | se ignora                        |
| `TRUSTED_CLIENT_IP_HEADER`          | opcional                | la cabecera con la IP real       |
| `API_PROXY_SECRET`                  | se ignora               | en Render y Vercel, el del back  |
| `ROUTE_CACHE_MAX_MB`                | opcional (256)          | opcional (256)                   |

## Pasar a vivo

Cambiar variables y volver a compilar, sin tocar código:

1. `API_MODE=live` y `NEXT_PUBLIC_API_MODE=live`.
2. `API_BASE_URL` con el origen del backend, `NEXT_PUBLIC_MP_PUBLIC_KEY` y un `REVALIDATE_SECRET` de 32 caracteres o más (el mismo que usa el backend).
3. `npm run build -w @galpon/store`: los _rewrites_ y las cabeceras de seguridad se fijan en el build, así que `API_MODE` tiene que estar definido al compilar.

En vivo, `/api/v1/*` se reescribe hacia `API_BASE_URL/api/v1/*` (mismo dominio para el navegador: sin CORS y con cookie propia) y el servidor consulta el backend directo. `/api/mock/v1` responde 404.

### IP del cliente para los límites del backend

El backend limita por IP el login, el registro, los pedidos, los formularios y las lecturas de la cuenta (`/me` y `/me/addresses`: 120 por minuto; `/me/orders` no tiene límite por IP). Todo lo del navegador le llega por el _rewrite_ de `/api/v1` y las páginas de `/cuenta` las lee el servidor de la tienda, así que la IP que ve es la del servidor de la tienda, salvo que confíe en `X-Forwarded-For`:

- El proxy de la tienda (`src/proxy.ts`) **borra** `x-forwarded-for`, `x-real-ip` y `forwarded` que mande el cliente en `/api/v1/*`: si no, cualquiera inventaría una IP por pedido y salteaba los límites.
- Con `TRUSTED_CLIENT_IP_HEADER` (el nombre de la cabecera donde el proxy de la plataforma escribe la IP real, pisando lo que mande el navegador; por ejemplo `cf-connecting-ip` detrás de Cloudflare) la tienda pone `x-forwarded-for` con ese valor. Sin ella no manda ninguna.
- En el backend, `TRUST_PROXY` tiene que listar la IP (o la red) del servidor de la tienda y la de cualquier proxy entre los dos: así Express toma la IP del cliente de `X-Forwarded-For` y los límites cuentan por cliente (ver "Proxies de confianza" en el README del back). Sin `TRUSTED_CLIENT_IP_HEADER` en la tienda, los pedidos llegan sin IP del cliente y el back los cuenta como de la tienda.
- Las lecturas de la cuenta que hace el servidor de la tienda por cada visitante (`getServerApiForRequest` de `lib/api.server.ts`: `/cuenta`, sus pedidos y sus direcciones) también mandan `X-Forwarded-For` con la IP de `TRUSTED_CLIENT_IP_HEADER` (`lib/client-ip.ts`, el mismo criterio que el proxy) y nunca las cabeceras de reenvío del navegador: si no, el back las contaría todas como de la tienda y alguien con una cookie de sesión inventada agotaría el límite de las páginas de cuenta de todos. Las lecturas públicas con caché (`getServerApi`) no la llevan: son de toda la tienda y el back no las limita cuando no conoce la IP del cliente.

## Producción en Render

Es el camino elegido, con el dominio propio (el paso a paso está en `backend/docs/DESPLIEGUE.md`, "Todo en Render con el dominio propio"): el servicio `galpon-mates-tienda` de [`render.yaml`](../../render.yaml), en la raíz del repo, sin carpeta raíz (el monorepo de npm necesita el `package-lock.json` de la raíz) y con la versión de Node de `.nvmrc`.

- Compila con `npm ci && npm run build -w @galpon/store` y arranca con `npm run start -w @galpon/store`: `next start` sin `--port` escucha en `$PORT` (Render da el 10000) y, sin esa variable, en el 3000 de siempre.
- Variables: las de "Producción en Vercel", salvo `TRUSTED_CLIENT_IP_HEADER=true-client-ip` (Cloudflare, que está delante de todos los servicios de Render, escribe ahí la IP del visitante pisando la del navegador; Render a `X-Forwarded-For` le agrega al final lo que manda el cliente, así que esa no sirve) y `NEXT_PUBLIC_SITE_URL=https://galponmates.com.ar`. `REVALIDATE_SECRET` y `API_PROXY_SECRET` las copia Render del servicio del back (`fromService`). `API_BASE_URL` es la dirección `onrender.com` del back: la tienda le habla desde su servidor y así no depende del DNS.
- Lo de la IP real y el secreto funciona igual que en Vercel (abajo).

## Producción en Vercel (mientras dure la mudanza)

Fue el camino elegido hasta la mudanza a Render (el paso a paso, pantalla por pantalla, está en `backend/docs/DESPLIEGUE.md`): un proyecto de Vercel con **Root Directory** `apps/store`, que detecta Next.js solo. El back va en Render.

- Variables: `API_MODE=live`, `NEXT_PUBLIC_API_MODE=live`, `API_BASE_URL` (la dirección del back en Render), `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `TRUSTED_CLIENT_IP_HEADER=x-real-ip` y `API_PROXY_SECRET`.
- `next build` lee el catálogo del back: el back tiene que estar levantado al desplegar.
- **La IP real del cliente.** Vercel pisa `x-real-ip` y `x-forwarded-for` con la IP del visitante, pero el back no puede confiar en la tienda por su dirección (las IP de salida de Vercel no son fijas) y entre los dos hay más saltos. Con `API_PROXY_SECRET` (el `TRUSTED_PROXY_SECRET` del back), `src/proxy.ts` y `lib/api.server.ts` mandan `x-galpon-proxy-secret` y la IP en `x-galpon-client-ip` (`lib/client-ip.ts`): el back solo le cree a quien trae el secreto. Las lecturas propias de la tienda mandan el secreto sin IP y el back no las cuenta en los límites por cliente. El proxy borra esas cabeceras si las manda el navegador.
- **La caché de páginas.** En Vercel las páginas generadas van a la caché de la plataforma, no a `.next/server/route-cache`: el tope de la pista 13 no arranca (`VERCEL=1`).

## Producción con Docker (camino alternativo)

No es el camino elegido: queda para un servidor propio. `Dockerfile` y `docker-entrypoint.sh` arman la imagen de la tienda que usa el compose del back (`backend/deploy/docker-compose.yml`; el paso a paso está en `backend/docs/DESPLIEGUE-SERVIDOR-PROPIO.md`). El contexto es la raíz del repo del front.

- La imagen trae el código y las dependencias, **sin compilar**: `next build` lee el catálogo del back y deja fijos el _rewrite_ de `/api/v1`, la CSP y las variables `NEXT_PUBLIC_*`, así que la tienda se compila dentro del contenedor la primera vez que arranca (con el back ya respondiendo y el entorno real) y deja la marca `.next/.galpon-compilada`. Los reinicios del mismo contenedor no vuelven a compilar; una imagen nueva sí.
- El compose le pasa `API_MODE=live`, `API_BASE_URL=http://api:3001` (la red interna de Docker), `REVALIDATE_SECRET`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_SITE_URL` y `TRUSTED_CLIENT_IP_HEADER=x-real-ip` (Caddy, el proxy de entrada, escribe ahí la IP real de cada visitante).
- Escucha en el 3000 dentro de la red del compose; no publica puertos (entra todo por Caddy).

## Caché y revalidación

Las lecturas del servidor son funciones `'use cache'` con `cacheTag` y `cacheLife`. Las que comparte toda la tienda (líneas, ajustes, pie) están en `src/lib/data/`; las de cada pantalla viven junto a su feature: los `features/*/*.data.ts` (inicio, tienda y producto), los `get-*-content.ts` (nosotros, preguntas frecuentes y legales) y `app/(tienda)/kit/kit-data.ts`. El backend avisa qué regenerar con `POST /api/revalidate`, con el secreto en la cabecera `x-revalidate-secret`:

```bash
curl -X POST localhost:3000/api/revalidate \
  -H 'x-revalidate-secret: dev-only-revalidate-secret-change-me-0000' \
  -H 'content-type: application/json' \
  -d '{"tags":["categories","product:mate-imperial-premium"]}'
```

- Etiquetas válidas: `products`, `categories`, `settings`, `combos`, `product:{slug}`, `reviews:{slug}` y `content:{página}`.
- Secreto inválido responde 401; un cuerpo de más de 8 kB, 413; más de 50 etiquetas, una etiqueta inválida o de más de 100 caracteres, 422.
- `content:*` se regenera con el perfil `'max'` (se sirve lo anterior mientras tanto); el resto vence al instante.
- En modo de prueba, la API simulada llama a `revalidateTag` directamente después de cada escritura que cambia datos con caché (ignora las etiquetas que no cumplen el formato de arriba): por ejemplo, un combo creado con `POST /api/v1/admin/combos` contra la tienda (la cookie del login de prueba y `X-CSRF-Token`, ver "Admin de la API simulada") se ve en la próxima carga del inicio. Sin sesión de admin, lo que cambia la página de todos son las compras (un pago aprobado descuenta stock, como en vivo) y las rutas de control, cerradas en producción. El dashboard en modo de prueba tiene su propia base y no avisa a la tienda (ADR 0003).

## Intro, telón y cursor

`features/intro` (Ruling MR-29): cada vez que se muestra el inicio se dibujan a mano el matecito y GALPÓN, se rellenan con el degradé del pie y la pantalla se abre como un libro (5 s; un clic, una tecla o la rueda la saltan). Los links del menú bajan un telón con el logo, navegan tapados y lo abren igual; hacia el inicio, el telón trae la intro entera. Con `prefers-reduced-motion: reduce` no hay intro ni telón. Con puntero fino, el cursor es el matecito del diseño (`public/cursors/`, al final de `app/globals.css`).

En los E2E, `gotoStore` (de `e2e/support/store.ts`) salta la intro al abrir el inicio: despacha un evento `wheel` en `window` (lo único que lo escucha es el proveedor de la transición) y espera a que la capa `[data-intro]` se vaya. Las pruebas de la intro piden `{ intro: 'keep' }`, y las que navegan por el menú esperan el telón con `settleIntro`.

## Páginas legales

`/terminos`, `/privacidad`, `/cookies` y `/devoluciones` (Rulings LS-2 y LS-3) usan `LegalRoute` de `features/legal`: leen el documento (`getLegalContent(document)`, etiquetas `content:legal` y `content:legal-{document}`) y los ajustes públicos, y lo dibujan con "Última actualización" y el botón "Imprimir o guardar como PDF".

- **Formato** (LA-1, `parseLegalBody`): bloques separados por una línea en blanco; `## Título` abre una sección con `id` = `slugify(título)` (con `-2`, `-3`… si se repite); un bloque de líneas con `- ` es una lista; lo demás es un párrafo. Enlaces `[texto](destino)` solo a `/ruta` interna (no `//host` ni `/\host`) o a `https://…` (se abren en otra pestaña); cualquier otro destino queda como texto. Nada de HTML.
- **Marcadores** (LA-2): `{{razon_social}}`, `{{cuit}}`, `{{condicion_iva}}`, `{{domicilio}}`, `{{email}}`, `{{telefono}}`, `{{area_atencion}}` y `{{horario_atencion}}` (`LEGAL_MARKERS`) se resuelven al dibujar con `resolveLegalMarkers` y los ajustes (`seller` y `contactEmail`). La página nunca muestra `{{` ni `}}`: sin el dato dice "a completar por el vendedor" y, en producción (`NODE_ENV=production` con `API_MODE=live`), queda vacío. La tienda compilada en modo de prueba no es producción.
- **Impresión** (`legal.css`): con `[data-legal-page]` en el `main`, `@media print` deja solo el documento en blanco y negro (sin encabezado, pie, botón, diálogos ni capas fijas) y los enlaces externos muestran su dirección entre paréntesis.
- **Pie**: la fila de los datos del vendedor (si están cargados), "Defensa del consumidor" con los dos enlaces de `consumerLinks` (siempre; el de CABA con las tres líneas de la Ley 2244) y el logo de Data Fiscal (`DATA_FISCAL_LOGO_URL`) solo con `seller.dataFiscalUrl`.
- **En modo de prueba** los datos del vendedor se cambian con `POST /api/v1/__mock/settings` (`{ seller?, consumerLinks? }`, con el secreto de los controles; `changeMockSeller` de `e2e/support/store.ts`).

## Seguridad

`next.config.ts` agrega a todas las respuestas la política de seguridad de contenido (CSP, sección 16 del spec; en desarrollo suma `'unsafe-eval'`), `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` y `Permissions-Policy`. Con `API_MODE=live`, el origen del backend se agrega a `connect-src`.

- **Optimizador de imágenes** (`src/lib/images.ts`): solo las rutas locales que pasan por `next/image`, sin búsqueda, anchos hasta 1920 px, calidad 75 y un tope de 256 MB para el caché de disco.
- **Proxy** (`src/proxy.ts`): limpia las cabeceras de reenvío en `/api/v1/*` (ver "IP del cliente para los límites del backend"), reescribe las fichas y las líneas con un slug que no tiene la forma de uno del contrato a la 404 de su sección (`/producto/_` o `/tienda/_`: una sola página para todas, así no se genera ni se guarda una por cada dirección inventada) y pone `Cache-Control: no-store` en las páginas de `/cuenta`.
- **Cambiar de sesión** (`resetAccountState`: ingresar, crear la cuenta, cambiar la contraseña o cerrar sesión) olvida el checkout y el pedido en curso de la pestaña (`galpon.checkout` y `galpon.order` de `sessionStorage`); al cerrar sesión, además, se refresca el router y se vuelve al inicio con reemplazo.
- **Webhook de revalidación:** cuerpo de hasta 8 kB y etiquetas de hasta 100 caracteres.
- **Tope de la caché de páginas en disco** (`src/lib/route-cache-limit.ts`, pista 13 de la auditoría): `next start` guarda en `.next/server/route-cache` cada página que genera, también la 404 de una ficha o de una línea con un slug de forma válida que no existe (6 archivos y unos 77 kB por dirección), y Next no le pone tope a esa carpeta. Al arrancar y cada minuto (`instrumentation.ts`, solo en `next start`) la tienda la mide y, si pasó `ROUTE_CACHE_MAX_MB` (256 MB por omisión), borra páginas enteras, las más viejas primero, hasta el 75 % del tope, y lo avisa en el log. Borrar una página es inocuo: la próxima visita la vuelve a generar. En Vercel no arranca (las páginas van a la caché de la plataforma). No se usó `experimental.isrFlushToDisk: false` (deja al optimizador de imágenes sin su caché de disco) ni `dynamicParams = false` (cada producto nuevo pediría recompilar).
- **CSP y Data Fiscal** (LA-5): `img-src` suma solo `https://www.afip.gob.ar` (el logo de ARCA). Toda fuente de la política tiene que estar en `CSP_ALLOWED_SOURCES` y ninguna puede coincidir con `TRACKER_HOST_PATTERN` (`src/lib/csp.test.ts`): es la prueba de LS-9, que falla si alguien suma un dominio de analítica o publicidad sin un banner de consentimiento.

## Estructura

```
src/
├─ app/            Layout, not-found, error, SEO (sitemap, robots, manifest) y los route handlers de /api
│  └─ (tienda)/    Las rutas públicas: inicio, tienda, tienda/[linea], producto/[slug], kit, nosotros,
│                  preguntas-frecuentes, contacto, arrepentimiento, terminos y privacidad
├─ features/       Una carpeta por pantalla o función (home, catalog, product, kit, cart, search, about,
│                  faq, contact, withdrawal, legal, reviews, toast, product-card, intro), con sus textos
│                  (*.copy.ts), sus lecturas cacheadas (*.data.ts) y sus tests. Una feature importa a
│                  otra solo por su index.ts (lo exige el lint)
├─ components/     Piezas compartidas: layout (cabecera, pie, menú), motion (animaciones) y ui (botones,
│                  campos, precios, estrellas, diálogo)
├─ lib/            Entorno, CSP, SEO, revalidación, clientes de la API y lecturas cacheadas (lib/data)
├─ test/           Preparación de los tests
├─ types/          Declaraciones de tipos (css.d.ts)
└─ instrumentation.ts   Valida el entorno al arrancar el servidor
```

La tipografía (Manrope) sale de `@fontsource-variable/manrope` con `next/font/local`, así el build no necesita red.
