# Galpón Mates — Diseño del frontend (tienda + dashboard)

| | |
|---|---|
| **Fecha** | 2026-10-19 · revisado 2026-10-20 (revisión adversarial de 4 enfoques: fidelidad al diseño, pagos/seguridad/legal, viabilidad técnica, completitud) · ajustado 2026-10-21 al cerrar P1 (contrato, contenido por rutas, versiones fijadas; ver la bitácora en `docs/BITACORA.md`) |
| **Estado** | Borrador para revisión de Lucas |
| **Alcance** | Fase 1: `frontend/` completo (tienda pública + dashboard) y el contrato de API que después implementa el backend |
| **Fuera de este documento** | Backend NestJS hexagonal + PostgreSQL + Redis: diseño propio en `2026-10-20-galpon-backend-design.md` (fase 2) |
| **Diseño visual de referencia** | `docs/design/galpon-tienda-v3/` (exportado de claude.ai/design, proyecto "Galpon Tienda v3") |

---

## 1. Objetivo

Construir el e-commerce de **Galpón Mates** (mates, bombillones y yerba con envío a todo el país) a partir del diseño "Galpón Tienda v3":

1. Una **tienda pública** fiel al diseño (incluidas sus animaciones), rápida, indexable y que cobra con Mercado Pago.
2. Un **dashboard** donde el dueño (un único usuario administrador) modifica productos, fotos, textos y configuración, y gestiona pedidos, pagos, reseñas y mensajes.
3. Un código que cualquier programador pueda abrir y entender: estructura por funcionalidad, tipado estricto, todo documentado, reglas automáticas que impiden que el orden se degrade.

**Criterios de éxito de la fase 1**

- Cada pantalla pasa su **lista de control visual** (sección 21.2) a 1440 px y 390 px, comparada con capturas del diseño exportado.
- Una compra completa en modo de prueba (como invitado y con cuenta; con "Mercado Pago" y con tarjeta; aprobada, pendiente y rechazada) termina en la pantalla correcta.
- El dashboard hace todas las operaciones de la sección 11 en modo de prueba.
- `typecheck`, `lint`, tests unitarios, de componentes, E2E y de accesibilidad pasan en limpio.
- Pasar a hablar con el backend real **solo requiere variables de entorno** (sección 13.4), sin cambios de código.

## 2. Decisiones

### 2.1 Tomadas con Lucas (2026-10-19)

| Tema | Decisión |
|---|---|
| Backend (fase 2) | ~~Python + FastAPI~~ → **NestJS** (TypeScript) con **arquitectura hexagonal** en un monolito modular, **PostgreSQL + Prisma**, **Redis** (colas BullMQ, caché, sesiones), Swagger. Cambio pedido por Lucas el 2026-10-20. El front se conecta por el mismo contrato OpenAPI |
| Base de datos (fase 2) | PostgreSQL |
| Pagos | Mercado Pago: redirección (Checkout Pro) **y** tarjeta en la página (Secure Fields) |
| Funciones del dashboard | Productos y stock · Pedidos y pagos · Contenido del sitio · Reseñas y mensajes |
| Compradores | Compra como invitado + cuenta opcional |
| Fotos | Cloudinary |
| Animaciones | Todas las del diseño, en dos etapas |
| Usuarios del dashboard | Un solo administrador |
| Estructura | Next.js (tienda) + Vite/React (dashboard) en un workspace **npm** con paquetes compartidos (Lucas instala con `npm i` y levanta con `npm run dev`) |
| Estilos | Tailwind CSS v4 + tokens del diseño |
| Idioma del código | Identificadores, carpetas y archivos en inglés; interfaz y comentarios de documentación en español |

### 2.2 Tomadas en este documento (Lucas puede cambiarlas al revisar)

| # | Decisión | Por qué |
|---|---|---|
| D1 | **Montos en pesos enteros** (sin centavos) en todo el sistema | Los precios del negocio son enteros; elimina diferencias de redondeo entre lo que se muestra y lo que se cobra |
| D2 | La tienda llama a la API **por su mismo dominio** (`/api/v1/*` reescrito por Next) | Cookie del cliente propia del sitio, sin CORS y CSP más simple |
| D3 | En Checkout Pro se **excluyen pagos en efectivo** (Rapipago, Pago Fácil) en v1 | Evita pedidos pendientes por días con stock reservado |
| D4 | Un pedido pendiente de pago **reserva stock 30 minutos**; después vence | Evita sobreventa sin bloquear stock indefinidamente |
| D5 | Cantidad máxima por producto: **20** (como el diseño), sin superar el stock | Fiel al diseño |
| D6 | El kit en armado **no se guarda** al cerrar la pestaña (como el diseño) | Fiel al diseño; el carrito sí se guarda |
| D7 | Reseñas con **moderación** y etiqueta "Compra verificada" solo si el back lo verifica | El diseño muestra la etiqueta en todas; sin verificar sería engañoso |
| D8 | **Sin analítica ni cookies de terceros** en la fase 1 | Se evalúa con el deploy |
| D9 | **Botón de arrepentimiento visible desde el primer acceso** en una barra superior fina, además del pie | Lo exige la Disposición 954/2025; el diseño solo lo tiene en el pie |
| D10 | Plan de implementación partido en **5 planes** (sección 21) | El alcance completo no entra en un solo plan verificable |
| D11 | **Repos de GitHub separados**: `LucasGonzalezRighi/Galp-nMatesE-comersFront-End` (carpeta `frontend/`) y `LucasGonzalezRighi/Galp-nMatesE-comersBack-end` (carpeta `backend/`; la base de datos vive dentro del repo del back). Lucas hace los push; acá solo se hacen commits locales | Pedido de Lucas (2026-10-20) |

## 3. Alcance

**Dentro de la fase 1**: `frontend/` completo; `docs/api/openapi.yaml` (contrato público, de clientes y de admin); modo de prueba que hace funcionar todas las pantallas sin backend; tests, lint, documentación, ADRs y CI.

**Fuera de la fase 1**: `backend/` (con su base de datos), envío real de emails, webhooks reales de Mercado Pago, firma real de Cloudinary, cálculo de envío por código postal, deploy.

## 4. Estructura del repositorio

**Repos separados** (D11): `frontend/` es el repo `Galp-nMatesE-comersFront-End` y `backend/` el repo `Galp-nMatesE-comersBack-end`, los dos en GitHub y subidos por Lucas. Este documento cubre solo el repo `frontend/`.

```
E-comers Marcos/
├─ frontend/                       ◄ Repo git del front = workspace npm
│  ├─ apps/
│  │  ├─ store/                    Tienda pública · Next.js (App Router)
│  │  └─ admin/                    Dashboard · Vite + React (SPA)
│  ├─ packages/
│  │  ├─ api-client/               Tipos generados del OpenAPI, cliente HTTP tipado, modo de prueba
│  │  ├─ schemas/                  Validaciones Zod compartidas + mensajes en español
│  │  ├─ domain/                   Reglas de negocio puras: dinero, kit, carrito, envío, cuotas, búsqueda
│  │  ├─ design-tokens/            Tokens del diseño (tema Tailwind v4 + constantes TS)
│  │  └─ config/                   tsconfig, ESLint y Prettier base
│  ├─ e2e/                         Playwright de punta a punta (tienda + admin)
│  ├─ docs/
│  │  ├─ api/openapi.yaml          Contrato front ↔ back (fuente de verdad hasta que exista el back)
│  │  ├─ adr/                      Decisiones de arquitectura
│  │  ├─ design/galpon-tienda-v3/  Referencia visual exportada (no se importa desde el código)
│  │  └─ superpowers/              Specs y planes
│  ├─ .github/workflows/ci.yml
│  ├─ lefthook.yml
│  ├─ scripts/dependency-versions.json  Versiones exactas de todas las dependencias (fuente única)
│  ├─ package.json                 Scripts: dev, build, typecheck, lint, test, e2e, api:generate
│  └─ README.md
└─ backend/                        (otro repo · fase 2; la base de datos vive dentro del repo del back)
```

El contrato vive en este repo mientras se construye el front. En la fase 2, el repo del back implementa el mismo archivo y un test de contrato compara el OpenAPI que genera NestJS (Swagger) con esta copia. Cualquier cambio de contrato se hace en los dos repos en el mismo cambio funcional.

> Las apps se llaman `store` y `admin` en el código (convención en inglés). Las rutas públicas van en español (`/tienda`, `/producto/...`).

**Dependencias permitidas** (controladas con `eslint-plugin-boundaries` y los `exports` de cada `package.json`):

```
apps/store ─┐
            ├──► api-client ──► schemas ──► domain
apps/admin ─┘         │
            ├──► schemas, domain, design-tokens
```

- `domain`: TypeScript puro, sin dependencias.
- `schemas`: solo `zod` y `domain`.
- `api-client`: sin React; los hooks de TanStack Query van en el subpath `@galpon/api-client/react`.
- Una app nunca importa de la otra. Los paquetes exportan código fuente TS (sin paso de build); Next (Turbopack) y Vite los transpilan.

## 5. Stack

Versiones estables verificadas el 2026-10-20. Se fijan **exactas** en `scripts/dependency-versions.json` (fuente única) y cada `package.json` usa esa misma versión; los paquetes propios (`@galpon/*`) se declaran con `"*"`. `npm run lint` corre `scripts/check-dependency-versions.mjs`, que falla si alguno se desvía. Regla: la última estable **compatible con la matriz de dependencias** — `npm install` sin errores de peers. `openapi-typescript` no se instala: se ejecuta con `npx --yes openapi-typescript@7.13.0` (su peer pide TypeScript 5 y npm no admite ese conflicto).

**Gestor de paquetes**: **npm workspaces** (`apps/*`, `packages/*`), por pedido de Lucas (2026-10-20): `npm i` instala todo y `npm run dev` levanta tienda (:3000) y admin (:5173) juntos con `concurrently`. El plan arrancó con pnpm; `catalog:` y `workspace:*` rompen `npm install`, por eso las versiones se centralizan en el JSON y se verifican con el script. El `package.json` raíz fuerza `handlebars` 4.7.10 con `overrides` (ver ADR 0007).

| Uso | Librería (versión de referencia) |
|---|---|
| Runtime | Node 24 LTS en CI y producción (`.nvmrc`); localmente funciona desde Node 22.12 (`engines`) |
| Lenguaje | TypeScript **6.0.x** (no 7.x: typescript-eslint y openapi-typescript todavía no lo soportan; se revisa con TS 7.1) |
| Tienda | Next.js 16.4 (App Router, Cache Components, Turbopack) + React 19.3 |
| Dashboard | Vite 8 + React 19.3 + TanStack Router 1.17x (rutas por archivos, tipadas) + TanStack Query 5 + TanStack Table **9** |
| Datos en cliente (las dos apps) | TanStack Query 5 |
| Estilos | Tailwind CSS 4.3 (`@theme`; `@tailwindcss/postcss` en Next, `@tailwindcss/vite` en el admin) |
| Componentes accesibles del admin | Radix UI (`radix-ui`), estilados con Tailwind, código dentro del repo |
| Formularios | React Hook Form 7 + `@hookform/resolvers` **5.9.2** |
| Validación | Zod 4 |
| Estado del carrito y del kit | Zustand 5 (carrito con `persist`) |
| Cliente HTTP | `openapi-fetch` + tipos de `openapi-typescript` 7 |
| Animaciones | `motion` 14 (ex Framer Motion). Etapa 2: `three` 0.186 |
| Pagos | `@mercadopago/sdk-js` (carga MercadoPago.js v2: Secure Fields + Core Methods) |
| Imágenes | `next/image` con loader de Cloudinary; subida firmada directa en el admin |
| Íconos | `@phosphor-icons/react` (el diseño usa Phosphor) |
| Tipografía | Inter: `next/font` en la tienda, `@fontsource-variable/inter` en el admin |
| Tests | Vitest 5 + Testing Library + jsdom **29.1.1** (no 30: pide Node ≥ 22.22 y Lucas usa 22.20) + Playwright 1.6x + `@axe-core/playwright` |
| Calidad | ESLint **9.39** (no 10: jsx-a11y, eslint-config-next y eslint-plugin-import no lo soportan todavía) + typescript-eslint `strictTypeChecked` + jsx-a11y + boundaries + react-hooks; Prettier; lefthook |

**TypeScript**: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. **No** se activa `exactOptionalPropertyTypes`: choca con los tipos que infiere Zod y con props opcionales de Radix y React Hook Form, y el costo supera el beneficio (ADR 0007).

## 6. Convenciones de código

**Nombres**: componentes `PascalCase.tsx` (uno exportado por archivo); hooks `useCamelCase.ts`; utilidades `camelCase.ts`; tipos `PascalCase` sin prefijo `I`; constantes de módulo `SCREAMING_SNAKE_CASE`; carpetas `kebab-case`; booleanos `is*`/`has*`/`can*`.

**Una funcionalidad** (igual en las dos apps):

```
features/cart/
├─ components/        Componentes visuales
├─ hooks/             Hooks propios
├─ lib/               Lógica local (si se comparte entre apps, va a packages/domain)
├─ cart.store.ts      Estado (si tiene)
├─ cart.types.ts      Tipos propios
├─ index.ts           API pública: lo único que otras partes pueden importar
└─ README.md          Qué hace, cómo se usa, qué decisiones tiene
```

**Documentación en el código**: TSDoc en español en todo lo exportado (qué hace, cada prop o parámetro, qué devuelve, `@example` si el uso no es obvio). Los comentarios internos explican el **por qué**. Sin números mágicos: constantes con nombre en `domain` o en `*.constants.ts`.

**Errores**: la API responde `application/problem+json` (RFC 9457) con `errors[]` por campo; `api-client` lo convierte en un `ApiError` discriminado (`validation`, `not_found`, `conflict`, `unauthorized`, `forbidden`, `rate_limited`, `server`, `network`). Ningún `catch` vacío. Los errores esperables se muestran en español; los inesperados van a la pantalla de error de la ruta.

**Prohibido** (lo bloquea ESLint): `any`, `@ts-ignore`/`@ts-expect-error` sin descripción, `console.log`, imports internos de otra funcionalidad, `dangerouslySetInnerHTML`, `!` (non-null assertion).

## 7. Tokens de diseño (`packages/design-tokens`)

**Origen**: los colores y sombras salen **solo** de `page-styles.css` (que pisa la paleta violeta por defecto de `ds-styles.css` con `html:root`). De `ds-styles.css` se toman radios, espacios, tipografía, foco y las medidas de los componentes.

| Grupo | Valores |
|---|---|
| Fondo / superficie / texto | `bg #1a1210` · `surface #271b15` · `text #f3ebe3` |
| Cobre (`accent`) 100–900 | `#fbf1e6 #f3dcc2 #e6bd91 #d59d63 #c0803f #9c6430 #774a24 #53331a #34200f` (500 = `#c0803f`) |
| Verde yerba (`accent-2`) 100–900 | `#f1f5e1 #dfe8bb #c5d68b #a8bf5f #8ba43f #6d8430 #516324 #384419 #232b10` (500 = `#8ba43f`) |
| Neutros 100–900 | `#f8f1ea #ebe0d5 #d6c8ba #b9a898 #998877 #7a6a5c #5c4f45 #42382f #2b241f` |
| Secciones | `section #3a2415` · `section-glow #5e3c20` · `section-ghost #7a5230` |
| Crema (fondos claros de las escenas 1, 4 y 6) | `cream #fffaf3` (degradado radial crema → neutral-100 → neutral-200, texto en `bg`) |
| Error | texto `oklch(0.76 0.12 25)` · borde de campo `oklch(0.72 0.14 25)` |
| Divisor | `color-mix(in srgb, #f3ebe3 15%, transparent)` |
| Sombras | `sm 0 0 0 1px #42382f` · `md 0 0 0 1px #5c4f45, 0 6px 18px rgba(0,0,0,.55)` · `lg 0 0 0 1px #998877, 0 16px 40px rgba(0,0,0,.65)` |
| Radios | `sm 4px` · `md 8px` · `lg 14px` · tag `6px` |
| Espacios | `1: 2.8px` `2: 5.6px` `3: 8.4px` `4: 11.2px` `6: 16.8px` `8: 22.4px` |
| Tipografía | Inter. Cuerpo 15px / 1.55. Títulos peso 500, interlineado 1.12, `letter-spacing -0.015em`: h1 42 · h2 32 · h3 25 · h4 20 · h5 16 px. Botones e inputs 14px; labels 12px; segmentados 13px; tags 11px |
| Foco y selección | `:focus-visible` contorno 2px `accent`, separación 2px · selección `accent` al 30% |
| Cueros (interfaz) | Negro `#221f22` · Marrón `#6b4532` · Crudo `#d7c29e` · Borravino `#5d1f2d` |
| Cueros (escena 6 y 3D) | `#3a2016 #6b3c22 #b88d5c #5a1c26` (más saturados para la iluminación; se mantienen las dos paletas) |
| Curvas | principal `cubic-bezier(.16,1,.3,1)` (1000 ms por defecto) · elástica `cubic-bezier(.34,1.56,.64,1)` |

Componentes base con las medidas del diseño: `.btn` (primary/secondary/ghost/icon 36×36, deshabilitado al 45%), `.input` (alto mínimo 36, fondo `surface`, borde divisor, foco borde `accent`), `.field` (label 12px al 70%), `.seg/.seg-opt`, `.tag` (accent/accent-2/neutral/outline). En `components/ui` se implementan como componentes con estas medidas, no como clases sueltas.

El paquete exporta `tokens.css` (variables + bloque `@theme`) y `tokens.ts` (los mismos valores tipados para canvas/three.js y tests). Tema oscuro únicamente (`color-scheme: dark`).

## 8. Reglas de negocio (`packages/domain`)

Funciones puras con tests escritos antes que el código.

| Regla | Detalle |
|---|---|
| Dinero | Todo monto es un **entero de pesos** (tipo con marca `Pesos`). Formato: `'$' + Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)` → **"$39.999"** (sin espacio, como el diseño). Descuentos con el signo menos U+2212: "−$3.600", "−10%" |
| Precio "a consultar" | `price: null` → "Consultar"; no se agrega al carrito |
| Comprable | publicado, con precio y con stock > 0 |
| Descuento del kit | `kitDiscountPercent` entero 0–30 (por defecto 10). Por kit: `ahorro = round(suma de las 3 piezas × % / 100)` en pesos |
| Kit válido | Un mate, una bombilla y una yerba (por grupo), los tres comprables |
| Opciones de mate | Cuero ∈ {Negro, Marrón, Crudo, Borravino}, por defecto Negro. Virola ∈ {Alpaca lisa, Alpaca cincelada, Acero}, por defecto Alpaca cincelada. Otros grupos no tienen opciones. No cambian el precio en esta versión. En el kit la virola es siempre Alpaca cincelada |
| Cantidad | Entero de 1 a `min(20, stock)`, contando el mismo producto en **todas** las líneas (sueltas y dentro de kits) |
| Totales del carrito y del pedido | `bruto` = suma de precios de lista · `ahorroKits` = suma de ahorros · **`subtotal = bruto − ahorroKits`** (es lo que el diseño llama "Subtotal": la línea del kit ya muestra su importe con descuento y "Ahorro por kit" es informativo) · **`total = subtotal + envío`** |
| Envío | 3 métodos fijos (`home`, `branch`, `pickup`), editables en costo, plazo y habilitado. Por defecto: Envío a domicilio $6.500 · 3 a 6 días hábiles; Envío a sucursal $4.900 · 3 a 6 días hábiles; Retiro en persona · sin costo · coordinamos por mail. Domicilio pide calle, número, piso/depto opcional, CP, ciudad y provincia; sucursal pide CP, ciudad y provincia; retiro no pide dirección |
| Cuotas | Ver sección 14.4 (solo se dice "sin interés" si el CFT es 0) |
| Número de pedido | Lo genera el back: `GLP-` + 5 dígitos |
| Código de producto | "N°07": correlativo que asigna el back al crear el producto, no editable |
| Relacionados | Hasta 4: misma línea primero, después el mismo grupo en otras líneas |
| Búsqueda | Normaliza (`NFD`, sin diacríticos, minúsculas, sin espacios extra) sobre nombre + descripción + línea |
| Reseñas | Promedio solo de aprobadas, una decimal con coma ("4,7"); fecha "Sep 2026" (mes abreviado en español, zona Buenos Aires) |
| Fechas | Toda fecha visible se formatea con `Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })` |

## 9. Tienda (`apps/store`, Next.js)

### 9.1 Rutas

| Ruta | Pantalla | Render |
|---|---|---|
| `/` | Inicio | Estático + revalidación por etiqueta |
| `/tienda` · `/tienda/[linea]` | Catálogo completo / por línea. Búsqueda y orden en `?q=&orden=` | Estático (catálogo publicado completo); filtrado y orden en el cliente (`useSearchParams` dentro de `<Suspense>`) |
| `/producto/[slug]` | Ficha | Estático por producto + revalidación; `dynamicParams` para productos nuevos; slug viejo → la API responde `200` con el producto y su slug actual, y la página hace `permanentRedirect` (308) al actual |
| `/kit` · `/kit?mate={slug}` | Armá tu kit (con `mate`: lo elige si es un mate comprable, conserva lo ya elegido y abre en el paso Bombilla; si no sirve, se ignora) | Estático; interacción en cliente |
| `/checkout` | Checkout | Dinámico, solo cliente, `noindex` |
| `/checkout/resultado?pedido=GLP-12345` | Resultado del pago | Dinámico, `noindex` |
| `/checkout/mp-simulado` | Solo modo de prueba: simula la página de Mercado Pago | Dinámico, `noindex` |
| `/pedido/[numero]` | Estado de un pedido de invitado (token en `sessionStorage`; en fase 2 también por link de un solo uso del email) | Dinámico, `noindex` |
| `/nosotros` | Nosotros | Estático + revalidación |
| `/preguntas-frecuentes` (`#envios` abre esa categoría) | Preguntas frecuentes | Estático + revalidación |
| `/contacto` | Contacto | Estático |
| `/arrepentimiento` | Botón de arrepentimiento (sección 9.6) | Estático |
| `/terminos` · `/privacidad` | Términos y condiciones · Política de privacidad | Estático + revalidación |
| `/cuenta/ingresar` · `/cuenta/registro` · `/cuenta/recuperar` · `/cuenta/restablecer` | Acceso de clientes | Cliente |
| `/cuenta` · `/cuenta/pedidos` · `/cuenta/pedidos/[numero]` · `/cuenta/direcciones` | Área del cliente (protegida en `proxy.ts`: sin cookie → `/cuenta/ingresar?volver=`) | Dinámico |
| `/api/revalidate` | El back avisa qué etiquetas regenerar | Route handler |
| `/api/mock/v1/[...path]` | Solo modo de prueba: la API simulada | Route handler |

Además: `not-found.tsx`, `error.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`, `icon.png`, `apple-icon.png`, `opengraph-image` por defecto, `theme-color` `#1a1210`, metadatos por página, Open Graph con la foto del producto y JSON-LD `Product` + `Offer` + `AggregateRating`.

### 9.2 Organización interna

```
apps/store/src/
├─ app/                        Solo rutas: buscan datos y componen piezas de features/
├─ features/
│  ├─ home/                    Hero, historia de 7 escenas, colección horizontal, destacados,
│  │                           manifiesto, cifras, bloque kit, reseñas destacadas
│  ├─ catalog/                 Grilla, botones de línea, buscador, orden, estado vacío, ProductCard
│  ├─ product/                 Galería, cuero y virola, cantidad, pestañas, garantías, relacionados
│  ├─ reviews/                 Resumen con distribución, listado, formulario
│  ├─ cart/                    Store, hidratador, panel lateral, línea, botón con contador
│  ├─ kit/                     Asistente de 3 pasos + resumen, store propio
│  ├─ checkout/                3 pasos, resumen, pago MP, resultado, simulador de MP
│  ├─ search/                  Modal de búsqueda (atajo "/")
│  ├─ withdrawal/              Formulario de arrepentimiento (usado en /arrepentimiento y en Contacto)
│  ├─ faq/  contact/  about/  legal/  account/
├─ components/
│  ├─ ui/                      Button, IconButton, Input, Textarea, Select, Field, Segmented, Tag,
│  │                           Stars, Price, NetPrice, InstallmentsNote, QuantityStepper, Swatch,
│  │                           ImageWithPlaceholder, Spinner, Dialog
│  ├─ layout/                  TopBar (arrepentimiento), Header, Nav, MobileMenu, Footer, Toast
│  └─ motion/                  Ver sección 17
├─ lib/
│  ├─ api.server.ts            Cliente para Server Components (mock en proceso o API_BASE_URL)
│  ├─ api.browser.ts           Cliente para el navegador (siempre /api/v1, mismo dominio)
│  ├─ data/                    Lecturas cacheadas ('use cache' + cacheTag + cacheLife)
│  ├─ env.ts                   Variables de entorno validadas con Zod
│  ├─ seo.ts                   Metadatos y JSON-LD
│  └─ cloudinary-loader.ts
├─ proxy.ts                    Protege /cuenta/*
└─ styles/globals.css          Tailwind + tokens + base
```

### 9.3 Datos y caché

- `next.config`: `cacheComponents: true`. Las lecturas del servidor están en `lib/data/` dentro de funciones `'use cache'` con `cacheTag('products')`, `cacheTag('product:' + slug)`, `cacheTag('categories')`, `cacheTag('settings')`, `cacheTag('content:' + page)`, `cacheTag('reviews:' + slug)` y `cacheLife` acorde. Funciona igual en modo de prueba y en vivo.
- `POST /api/revalidate` (cabecera `x-revalidate-secret`, comparación en tiempo constante) recibe etiquetas y llama a `revalidateTag(tag, { expire: 0 })` para precios, stock, productos, líneas y ajustes (el próximo visitante ya ve el dato nuevo) y a `revalidateTag(tag, 'max')` para contenido. En modo de prueba, la API simulada llama a `revalidateTag` directamente después de cada escritura.
- Con más de una instancia en producción hace falta un *cache handler* compartido (se define con el deploy).
- `generateStaticParams` devuelve siempre al menos un parámetro (si el catálogo está vacío, uno de relleno que responde `notFound()`).
- Lo que depende del usuario (carrito, kit, checkout, cuenta, formularios) son Client Components y usan TanStack Query contra `/api/v1`.
- Con Cache Components las rutas visitadas quedan montadas ocultas (`<Activity>`): los formularios con estado final ("Mensaje enviado", checkout) se reinician con `key` al volver a entrar.
- El año del pie se calcula en un Client Component.

### 9.4 Estado del cliente

**Carrito** (`features/cart/cart.store.ts`, Zustand + `persist`)

- `persist({ name: 'galpon.cart', version: 1, migrate, skipHydration: true })`. Un `<CartHydrator/>` en el layout llama a `persist.rehydrate()` en un efecto; el contador y el panel se muestran recién con `hasHydrated` (sin errores de hidratación).
- Líneas discriminadas por `type`: `product { productId, quantity, options? }` y `kit { mateId, bombillaId, yerbaId, leather, quantity }`. La clave de línea se deriva del contenido, así se suman líneas iguales.
- Guarda **solo identificadores y cantidades**. Nombre, precio, foto y stock se resuelven con `GET /products?ids=` y los totales con `domain`. El precio nunca viaja desde el navegador como dato de verdad.
- **Conciliación** (al hidratar con el catálogo cargado, al abrir el panel y al entrar al checkout):

| Situación | Qué pasa |
|---|---|
| Producto despublicado, archivado o inexistente | Se quita la línea y se avisa con un toast |
| Producto sin stock | La línea queda marcada "Sin stock", no suma y bloquea "Finalizar compra" hasta quitarla |
| Stock menor que la cantidad | Se baja al máximo y se avisa |
| Cambió el precio o el % del kit | Se toma el valor nuevo y se avisa una vez |

**Kit** (`features/kit/kit.store.ts`, en memoria, no se guarda): paso actual (Mate, Bombilla, Yerba, Resumen), pieza elegida por paso, cuero. Pasos clicables libremente (incluido Resumen). Al elegir una opción avanza solo a los 420 ms. "Empezar de nuevo" y "Agregar kit al carrito" reinician piezas y paso, **no** el cuero. Al agregar: toast y se abre el carrito a los 850 ms.

### 9.5 Pantallas

**Barra superior** (nueva, D9): fina, en todas las páginas, con el link "Botón de arrepentimiento" visible sin scroll en escritorio y celular.

**Header**: logo; 6 links (Inicio, Tienda, Armá tu kit, Nosotros, Preguntas, Contacto) desde 1040 px; "Tienda" queda activo también en la ficha de producto; búsqueda; carrito con contador que rebota al agregar; hamburguesa debajo de 1040 px. Fondo de vidrio al pasar los 8 px de scroll y barra de progreso de scroll (todo el sitio).

**Menú móvil**: capa a pantalla completa debajo del header (64 px), links grandes con aparición escalonada de 50 ms; ahí el link dice "Preguntas frecuentes".

**Toast**: abajo al centro; ícono de check, título, subtítulo y botón "Ver carrito"; dura 2,8 s; se oculta al abrir el carrito. Textos: "Agregado al carrito" + nombre; "Kit agregado al carrito" + "Descuento de N% aplicado".

**Búsqueda**: modal con el ícono o con "/" (fuera de campos de texto); foco en el campo al abrir; placeholder "Buscá un mate, bombilla o yerba…"; vacía muestra las líneas; hasta 6 resultados; "Sin resultados para '…'."; "Ver todos los resultados en la tienda"; Enter abre el producto si hay uno solo o va a la tienda con la búsqueda; cierra con Escape o clic afuera. Busca sobre el catálogo publicado (se carga al abrir por primera vez).

**Tarjeta de producto (Vitrina)**: foto o placeholder, línea, nombre, estrella y promedio si hay reseñas, precio o "Consultar", "3 cuotas de $…" o "Precio a confirmar" (sección 14.4), etiquetas "Sin stock" / "Consultar", "Ver detalle" y botón de agregar rápido (deshabilitado si no es comprable; en mates usa las opciones por defecto). Precio sin impuestos nacionales (sección 14.5).

**Inicio**

- Hero "Encontrá tu mate." con "Ver la tienda" y "Armá tu kit" (tag con el descuento "−10%").
- Historia de 7 escenas (`data-sc` 0–6): hero · "Tres piezas. Una ronda." (mini tarjetas de mate, bombilla y yerba con "+") · "Calabaza curada. Virola de alpaca." (cifras: modelos de mate, líneas de mate, cueros) · "Alpaca y bronce." (2 bombillones) · "Para cada cebada." (3 yerbas) · "Agua a 75 °C." (4 pasos del ritual) · "Elegí el cuero." (muestras que cambian de nombre con el scroll). **Desde 1024 px y sin `prefers-reduced-motion`, las seis escenas que siguen a la portada son "el paseo del mate"** (2026-10-27): una sección fija a la altura de la ventana (`ScrollStage`, `(paradas + 1) × 100svh`) donde el scroll vertical desliza las paradas de costado; cada parada se queda quieta el 55 % de su tramo y desliza en el resto con una curva suave. El mate queda a la derecha como referencia (foto de la pieza de cada parada con fundido, deriva lenta y la calabaza más grande; el 3D de P5 entra en esa capa), el raíl de la derecha marca la parada actual (`aria-current`) y lleva a cualquiera, y la pista "Deslizá para recorrer" se esconde al empezar. El servidor y la hidratación dibujan las escenas apiladas; el cliente cambia al paseo después de hidratar. **Por debajo de 1024 px y con menos movimiento quedan las escenas apiladas**, como el diseño a 390 px.
- Los productos de las escenas 1, 3 y 4 se eligen en `HomeContent.storyProducts`; si uno no es comprable se usa el siguiente comprable de su grupo.
- Colección en scroll horizontal fijo con las líneas y tarjeta final "Ver todo el catálogo · N piezas".
- Destacados (productos `featured`), manifiesto que se ilumina por palabra, 4 cifras animadas, bloque "Armá tu kit" con la cantidad de opciones por grupo, 3 reseñas destacadas (con producto y link).
- **Cifras**: se calculan del catálogo publicado — piezas (27), líneas (6), modelos de mate (16), líneas de mate (4), cueros (4), opciones por grupo en el kit (solo comprables). Son texto editable: provincias con envío (24) y socios (2). El texto del paso 1 del kit ("N mates entre…") usa la cantidad de mates comprables.

**Tienda**: título y bajada de la línea ("Todo el catálogo" / "Mates, bombillones y yerba. Elegí, sumá al carrito y pagá online."); contador "N piezas"; botones de línea con cantidad; búsqueda; orden Destacados / Menor precio / Mayor precio / A–Z (sin precio al final en "Menor precio"); al cambiar línea u orden la grilla reaparece escalonada; vacío "No encontramos resultados para '…'." con "Limpiar búsqueda"; banda final hacia el kit. Línea sin productos: "Todavía no hay piezas en esta línea" + link a la tienda.

**Producto**

- Migas; galería con flechas y miniaturas si hay más de una foto; código "N°07"; promedio y "N reseñas" (lleva a las reseñas).
- Precio, precio sin impuestos nacionales, leyenda de cuotas con CFT (sección 14.4).
- Stock: "En stock · listo para despachar" (con punto que late) o "Sin stock por ahora".
- Solo mates: cuero (4 muestras) y virola (segmentado).
- Comprable: cantidad (1 a máx.), "Agregar al carrito" (vuelo al carrito) y "Comprar ahora" (agrega y va al checkout). No comprable (sin precio **o** sin stock): "Consultar por mail" con asunto "Consulta: {nombre}".
- Garantías: Envío a todo el país · Pago seguro con Mercado Pago · Cambios (10 días) y Arrepentimiento por separado (sección 14.6).
- Pestañas Descripción / Materiales (Contenido en yerbas) / Envío y cambios / Cuidado (Conservación en yerbas). Los textos por grupo son contenido editable; un producto puede tener textos propios; la API devuelve el texto final. La pestaña cambia con un fundido.
- "Completá la ronda" (solo mates): lleva a `/kit?mate={slug}`.
- Reseñas: promedio con contador animado, estrellas, distribución 5→1 con barras; listado con estrellas, fecha, nombre y "Compra verificada" solo si `verifiedPurchase`; vacío "Todavía no hay reseñas de este producto. Sé el primero en contar cómo te fue."; formulario con estrellas que se iluminan al pasar ("Elegí una puntuación", "Malo"… "Excelente"), nombre, texto, aviso de privacidad, "Cancelar" / "Publicar reseña"; al enviar: "Gracias, tu reseña se publica cuando la revisemos".
- "Más para la ronda": 4 relacionados.

**Armá tu kit**: título "Tres pasos. Una ronda completa."; barra de pasos con estado (✓ elegido, "Sin elegir", "Faltan N", "Listo para agregar"); por paso: "Elegí el mate / la bombilla / la yerba" + ayuda, grilla de opciones **comprables** con check; vista Resumen "Tu kit — Revisá las piezas. Tocá cualquiera para cambiarla."; panel con las piezas, cuero del mate (muestras), subtotal, "Descuento kit −10%", total, aviso de lo que falta, "Agregar kit al carrito" (deshabilitado hasta tener las tres) y "Empezar de nuevo". Al cambiar de paso vuelve arriba con scroll suave. Si un paso no tiene opciones comprables: "No hay {grupo} disponibles por ahora".

**Carrito (panel)**: título "Carrito (N)"; líneas con foto (el kit muestra el logo), detalle (cuero y virola, o "Mate + Bombilla + Yerba · Cuero negro"), "Ahorrás $…" en kits, cantidad ("−" en 1 quita la línea), quitar, total por línea; "Ahorro por kit" (informativo), "Subtotal", "El envío se calcula en el checkout", "Finalizar compra", "Seguir comprando". Vacío: ilustración, "Tu carrito está vacío", "Elegí tu próximo compañero de ronda.", "Ir a la tienda".

**Checkout**: sección 14.

**Nosotros**: hero de tres líneas con parallax del fondo siguiendo el mouse; dos socios (foto, nombre, rol: editables); frase que se ilumina con el scroll; "Cómo trabajamos" en 3 pasos (editables); "Conocé la tienda".

**Preguntas frecuentes**: 6 categorías (Envíos, Pagos y cuotas, Curado del mate, Cuero y alpaca, Cambios y devoluciones, Retiro en persona), acordeón numerado, "¿No encontraste tu respuesta? Escribinos". Contenido editable.

**Contacto**: "Escribinos."; email con "Copiar" / "Copiado"; accesos "Antes de escribir" (Envíos y seguimiento, Cambios y devoluciones, Cómo curar tu mate); formulario (nombre, email, n° de pedido opcional, motivo Pedido/Envío/Cambio/Arrepentimiento/Otro, mensaje, aviso de privacidad); "Enviando…"; "Mensaje enviado — Gracias, {nombre}. Te respondemos a {email}." y "Escribir otro mensaje". Elegir "Arrepentimiento" cambia al formulario de la sección 9.6. Se muestran canal alternativo, área responsable y horario de atención (sección 14.6).

**Pie**: "Hechos para compartir.", bajada, email, links de líneas, Ayuda (Preguntas frecuentes, Envíos, Cambios y devoluciones, Contacto, Botón de arrepentimiento), Galpón (Sobre nosotros, Armá tu kit, Todo el catálogo), Legales (Términos, Privacidad, Defensa del consumidor opcional), datos del vendedor y QR de Data Fiscal (sección 14.6), medios de pago, "© {año} Galpón Mates" y wordmark que aparece con recorte.

### 9.6 Botón de arrepentimiento

Por la **Disposición 954/2025** de la Subsecretaría de Defensa del Consumidor y Lealtad Comercial (BO 04/09/2025, deroga las Res. 316/2018 y 424/2020):

- El link "Botón de arrepentimiento" está **a simple vista, en lugar destacado y en el primer acceso**: barra superior + pie.
- **No se exige registración ni trámites adicionales**: `/arrepentimiento` pide nombre, email usado en la compra y, opcionalmente, n° de pedido y comentario.
- Al enviar se muestra el **código de identificación del trámite** que devuelve la API, y (fase 2) se manda por email dentro de las 24 h.
- La solicitud aparece en el dashboard en Mensajes, destacada con su código.

### 9.7 Estados por pantalla

| Pantalla | Cargando | Vacío | Error |
|---|---|---|---|
| Páginas estáticas | — (se sirven cacheadas) | según pantalla (ver 9.5) | si la API falla al regenerar, se sigue sirviendo la última versión; si nunca se generó, `error.tsx` "No pudimos cargar esta página" + reintentar |
| Producto inexistente o en borrador | — | — | `not-found` "No encontramos ese producto." + "Volver a la tienda" (`noindex`) |
| Formularios (reseña, contacto, arrepentimiento, cuenta) | botón con spinner y texto ("Enviando…") | — | errores por campo; error de red: "No pudimos conectar, probá de nuevo" en el formulario |
| Carrito | contador oculto hasta hidratar | ver 9.5 | toast "No pudimos actualizar el carrito" + reintento automático |
| Búsqueda | spinner en el modal la primera vez | líneas / "Sin resultados" | "No pudimos buscar, probá de nuevo" |
| Checkout | paso con esqueleto mientras cotiza | carrito vacío: "Tu carrito está vacío." + "Ir a la tienda" | ver 14 |
| Resultado / pedido | "Consultando tu pedido…" | — | token ausente o inválido: "No encontramos ese pedido" (sin revelar si existe) |
| Cuenta | esqueleto | "Todavía no hiciste pedidos" / "No tenés direcciones guardadas" | error de red con reintento; 401 → ingresar |

## 10. Variantes y código del diseño que no se portan

- Tarjeta de producto: solo **Vitrina**; "Ficha" e "Inmersiva" se descartan.
- Código muerto del diseño: escena "ritual" (`data-stage`, `data-ritual`, `data-hero-photo`), `heroVariant`, `updateMate`, `MATE_STEPS`, `data-mate`.
- `tiltStrength` (10°) y `cursorGlow` (activado) quedan como constantes.
- Reseñas propias guardadas en `localStorage` con etiqueta "Tu reseña": reemplazadas por moderación (D7).

## 11. Dashboard (`apps/admin`, Vite + React)

### 11.1 Rutas

| Ruta | Pantalla |
|---|---|
| `/login` | Ingreso |
| `/` | Resumen: ventas de hoy y de los últimos 7 días (zona Buenos Aires, las calcula el back), pedidos pagados sin despachar, stock bajo, reseñas pendientes, mensajes sin leer, alertas de pagos (contracargos, disputas, cobros duplicados) |
| `/productos` | Tabla: búsqueda, filtro por línea, estado (borrador / publicado) y "sin stock"; orden por columnas; paginación |
| `/productos/nuevo` · `/productos/$id` | Nombre, slug (autogenerado, editable, único; los anteriores redirigen), línea, descripción, textos propios de pestañas (opcionales), precio o "a consultar", stock, destacado, estado, fotos. "Archivar" en lugar de borrar |
| `/lineas` | Nombre, slug, grupo, bajada, foto, orden (arrastrar). No se borra una línea con productos |
| `/pedidos` | Tabla: filtro por estado del pedido y estado del pago; búsqueda por número, email o nombre |
| `/pedidos/$numero` | Cliente, dirección, líneas (copia al momento de la compra), totales, pago (estado, detalle, medio, últimos 4, cuotas, ID y link a MP), historial, acciones de despacho |
| `/contenido/inicio` · `/contenido/nosotros` · `/contenido/preguntas` · `/contenido/pestanas` · `/contenido/pie` · `/contenido/legales` | Textos por campos fijos |
| `/ajustes` | Descuento del kit; envíos; cuotas sin interés y si se muestran en la ficha; precio sin impuestos (condición fiscal y alícuota); datos del vendedor y atención al cliente; email de contacto; umbral de stock bajo |
| `/resenas` | Pendientes / aprobadas / ocultas; aprobar, ocultar, destacar en el inicio |
| `/mensajes` | Contacto y arrepentimientos (con código); marcar leído |
| `/cuenta` | Cambiar contraseña |

### 11.2 Organización interna

```
apps/admin/src/
├─ main.tsx
├─ app/                        Router, providers (QueryClient, sesión), layout con menú lateral
├─ routes/                     Rutas de TanStack Router por archivo (routeTree.gen.ts generado)
├─ features/
│  ├─ auth/  dashboard/  products/  categories/  orders/  content/  settings/  reviews/  messages/
│  └─ media/                   Subida a Cloudinary (XHR con progreso), orden y texto alternativo
├─ components/ui/              DataTable (TanStack Table v9), Form, Field, Dialog, ConfirmDialog,
│                              DropdownMenu, Tabs, Badge, Toast, EmptyState, Pagination, ImageDropzone
└─ lib/                        api.ts, env.ts, format.ts
```

Cada tabla y formulario del admin define sus estados: cargando (esqueleto), vacío (`EmptyState` con acción), error (mensaje + reintentar), guardando (botón deshabilitado con spinner) y "cambios sin guardar" (aviso al salir).

### 11.3 Sesión del administrador

- Un único administrador; lo crea el back con un comando (no hay alta desde el dashboard).
- `POST /admin/auth/login` → cookie `__Host-galpon_admin` (`httpOnly`, `Secure`, `SameSite=Lax`, vencimiento).
- **CSRF**: token ligado a la sesión (HMAC del id de sesión), rotado en cada login y enviado en `X-CSRF-Token` en cada petición que modifica. `POST /admin/auth/login` lo devuelve en su respuesta `{ email, csrfToken, expiresAt }` (no hay sesión previa desde la cual pedirlo) y `GET /admin/auth/csrf` lo vuelve a entregar después de una recarga.
- Un `401` cierra la sesión y lleva a `/login?redirect=`.
- Despliegue previsto: admin en `admin.galponmates.com.ar`, API en `api.galponmates.com.ar`. CORS de `/api/v1/admin/*` acepta solo el origen del admin con credenciales (`credentials: 'include'`).

### 11.4 Fotos (Cloudinary)

1. Validación en el navegador: JPG, PNG o WebP, hasta 10 MB, lado menor ≥ 800 px; hasta 8 por producto, 1 por línea, 1 por socio.
2. `POST /admin/media/signature { purpose: 'product'|'category'|'partner'|'site' }` → `{ timestamp, signature, apiKey, cloudName, folder }`.
3. Subida directa a `https://api.cloudinary.com/v1_1/{cloudName}/image/upload` con **XMLHttpRequest** (progreso, cancelar, reintentar), enviando exactamente los parámetros firmados. No pasa por `api-client`.
4. Se guarda `{ publicId, width, height, alt }`; texto alternativo obligatorio (3–120). Se reordenan arrastrando; la primera es la principal.
- En modo de prueba la subida se simula y la vista previa usa una URL `blob:`.

### 11.5 Pedidos y pagos

Estados del pedido y transiciones:

```
pending_payment ──(pago aprobado)──► paid ──► preparing ──► shipped ──► delivered
      │                                │
      ├──(30 min sin pago)──► expired  └──(devolución total)──► refunded
      └──(admin)──► cancelled
```

- El estado del pago lo escribe solo el back a partir de Mercado Pago (sección 14.3). El admin no lo edita.
- Acciones del admin: "En preparación", "Despachado" (exige empresa y número de seguimiento), "Entregado", "Cancelar" (solo sin pago).
- Alertas: contracargo, disputa y segundo pago aprobado para un pedido ya pagado (para devolver).
- Las devoluciones de dinero se hacen desde Mercado Pago en esta versión; el pedido muestra el link al pago.

## 12. Contrato de API (`docs/api/openapi.yaml`)

OpenAPI 3.1, prefijo `/api/v1`. Fuente de verdad: `api-client` genera sus tipos con `npm run api:generate` y el back NestJS lo implementa en la fase 2 (con un test que compara su OpenAPI con este).

**Convenciones**: JSON en `camelCase`; montos en pesos enteros con sufijo `Ars` (`priceArs`, `totalArs`); fechas ISO 8601 UTC; listas `?page=&pageSize=` (máx. 100) → `{ items, page, pageSize, total }`; errores `problem+json` `{ type, title, status, detail, errors?: [{ field, code, message }] }`; `429` con `Retry-After`; las escrituras de pedidos y pagos llevan `Idempotency-Key` (UUID por intento).

**Públicos**

| Método y ruta | Uso |
|---|---|
| `GET /categories` | Líneas con cantidad de productos publicados |
| `GET /products?category=&group=&ids=&q=&sort=&featured=&page=&pageSize=` | Catálogo (la tienda pide el publicado completo) |
| `GET /products/{slug}` | Ficha; `404` si no está publicado; si el slug es viejo: `200` con el producto y su `slug` actual (la página de la tienda redirige con `permanentRedirect`, 308; así `fetch` no sigue la redirección por su cuenta) |
| `GET /products/{slug}/related` | Hasta 4 relacionados |
| `GET /products/{slug}/reviews?page=` | Reseñas aprobadas + promedio + distribución |
| `POST /products/{slug}/reviews` | Nueva reseña → `202` (pendiente de aprobación) |
| `GET /reviews/featured` | Reseñas destacadas del inicio (con producto) |
| `GET /content/home` · `/content/about` · `/content/faq` · `/content/footer` · `/content/product-tabs` · `/content/legal/{document}` (`terms` \| `privacy`) | Contenido editable; una ruta por contenido, así cada respuesta tiene su tipo exacto (`HomeContent`, `AboutContent`, `FaqContent`, `FooterContent`, `ProductTabsContent`, `LegalContent`) |
| `GET /settings/public` | Ver `PublicSettings` |
| `POST /cart/quote` | `{ items }` → precios, ahorros, disponibilidad y máximos por línea (fuente de verdad de los importes en el checkout) |
| `POST /shipping/quote` | `{ method, postalCode?, items }` → costo y plazo. En v1 no se usa: el costo sale de `PublicSettings`. `postalCode` es opcional para `pickup` |
| `POST /orders` | Crea el pedido → `201 { order, orderToken }`; `409` con `type` `stock_changed` / `price_changed` / `total_changed` y qué cambió |
| `GET /orders/{number}` | Cabecera `X-Order-Token` (o cookie de cliente dueño del pedido) |
| `POST /orders/{number}/payments/mercadopago/preference` | `X-Order-Token` + `Idempotency-Key` → `{ initPoint }` |
| `POST /orders/{number}/payments/mercadopago/card` | `X-Order-Token` + `Idempotency-Key` → `{ paymentStatus, statusDetail, challenge?: { url } }` |
| `POST /contact` | Mensaje → `202` |
| `POST /withdrawals` | Arrepentimiento → `201 { code }` |
| `POST /webhooks/mercadopago` | Solo back (documentado para la fase 2) |

**Clientes** (cookie `__Host-galpon_session`; las escrituras llevan `X-CSRF-Token`)

`GET /auth/csrf` · `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `POST /auth/password/forgot` · `POST /auth/password/reset` · `GET|PATCH /me` · `GET /me/orders` · `GET /me/orders/{number}` · `GET|POST /me/addresses` · `PATCH|DELETE /me/addresses/{id}`

**Admin** (prefijo `/admin`, cookie de admin + `X-CSRF-Token`)

`POST /admin/auth/login` (→ `{ email, csrfToken, expiresAt }`) · `POST /admin/auth/logout` · `GET /admin/auth/me` · `GET /admin/auth/csrf` (vuelve a entregar el token después de una recarga) · `POST /admin/auth/password` · `GET /admin/dashboard/summary` · `GET|POST /admin/products` · `GET|PATCH /admin/products/{id}` · `POST /admin/products/{id}/archive` · `GET|POST /admin/categories` · `PATCH|DELETE /admin/categories/{id}` (`409` si tiene productos) · `PUT /admin/categories/order` · `POST /admin/media/signature` · `GET /admin/orders` · `GET /admin/orders/{number}` · `POST /admin/orders/{number}/status` · `GET|PUT /admin/content/home` · `/about` · `/faq` · `/footer` · `/product-tabs` · `/legal/{document}` (`terms` \| `privacy`) · `GET|PUT /admin/settings` · `GET /admin/reviews` · `PATCH /admin/reviews/{id}` · `GET /admin/messages` · `PATCH /admin/messages/{id}`

**Modelos** (resumen; el detalle está en el YAML)

- `Category { id, slug, name, group: 'mate'|'bombilla'|'yerba', blurb, image?, position, productCount }`
- `ProductSummary { id, slug, code, name, description, categoryId, categorySlug, categoryName, group, priceArs|null, netPriceArs|null, isPurchasable, isSoldOut, maxQuantity, featured, mainImage?, rating: { average, count } }`
- `ProductDetail = ProductSummary + { images[], tabs: { descriptionNote: string | null, materials, shipping, care }, options?: { leathers[], ferrules[] } }` (la pestaña Descripción muestra `description` y, si existe, `descriptionNote`, por ejemplo la nota de "cada pieza es artesanal" de los mates; el resto de `tabs` viene ya combinado: texto del producto si existe, si no el del grupo)
- `Image { publicId, url, width, height, alt }`
- `Review { id, authorName, rating, text, createdAt, verifiedPurchase, product?: { slug, name } }`
- `CartItemInput = { type: 'product', productId, quantity, options? } | { type: 'kit', mateId, bombillaId, yerbaId, leather, quantity }`
- `CartQuote { lines: [{ key, name, detail, unitPriceArs, kitSavingsArs, totalArs, maxQuantity, issue?: 'unavailable'|'sold_out'|'quantity_reduced'|'price_changed' }], itemsGrossArs, kitSavingsArs, subtotalArs }`
- `CreateOrderInput { customer: { email, firstName, lastName, phone? }, shipping: { method, address: ShippingAddress | null }, items: CartItemInput[], paymentMethod: 'mp_redirect'|'card', expectedTotalArs, website? }`
- `Order { number, status, paymentStatus, customer, shipping: { method, address: ShippingAddress | null, costArs, eta }, lines: OrderLine[], itemsGrossArs, kitSavingsArs, subtotalArs, shippingArs, totalArs, payment: { method, installments?, paymentTypeId?, lastFour?, statusDetail?, mpPaymentId? }, tracking?: { carrier, number }, history: [{ status, at, note? }], reservedUntil, createdAt }`
- `OrderLine` (copia al momento de la compra) `{ type, name, detail, quantity, unitPriceArs, kitSavingsArs, totalArs, productSlug?, options?, kitItems?: [{ slug, name, unitPriceArs }] }`
- `ShippingAddress = AddressInput | BranchAddressInput`: destino de un envío. `AddressInput { street, number, apartment: string | null, postalCode, city, province }` se usa en `home`; `BranchAddressInput { postalCode, city, province }` en `branch` (a sucursal solo se piden esos tres datos); en `pickup` la dirección es `null`
- `Address { id, label?, street, number, apartment?, postalCode, city, province, isDefault }` · `Customer { email, firstName, lastName, phone? }` · `OrderSummary { number, createdAt, status, paymentStatus, totalArs, itemCount }`
- `ShippingOption { method: 'home'|'branch'|'pickup', label, costArs, eta, enabled }`
- `PublicSettings { kitDiscountPercent, shippingOptions: ShippingOption[], installments: { maxWithoutInterest, showOnProduct }, contactEmail, priceDisplay: { showNetPrice }, seller: { legalName, cuit, taxCondition, address, phone, supportArea, supportHours, dataFiscalUrl? } }`
- `HomeContent` (textos del hero, de cada escena, del manifiesto, del bloque kit; cifras editables `provinces`, `partners`; `storyProducts: { hero, bombillas: [slug, slug], yerbas: [slug, slug, slug] }`), `AboutContent` (intro, frase, socios `{ name, role, photo }[]`, pasos `{ title, text }[3]`), `FaqContent` (categorías con preguntas), `FooterContent`, `ProductTabsContent` (por grupo), `LegalContent` (título + cuerpo en texto con párrafos)
- `ContactMessage { id, kind: 'contact'|'withdrawal', name, email, orderNumber?, reason?, message?, code?, createdAt, read }`
- Admin: `AdminProduct` (+ `status: 'draft'|'published'|'archived'`, `stock`, `tabsOverride?`, `previousSlugs[]`, `updatedAt`), `AdminReview` (+ `status: 'pending'|'approved'|'hidden'`, `featured`), `DashboardSummary { salesTodayArs, salesLast7DaysArs, ordersToShip, lowStock[], pendingReviews, unreadMessages, paymentAlerts[] }`, `AdminSettings` (= `PublicSettings` + `lowStockThreshold`, `vatRatePercent`)

## 13. Capa de datos y modo de prueba (`packages/api-client`)

### 13.1 Estructura

```
packages/api-client/src/
├─ generated/schema.d.ts       Generado desde docs/api/openapi.yaml (no se edita)
├─ client.ts                   createApiClient({ baseUrl, fetch?, credentials? }) sobre openapi-fetch
├─ errors.ts                   problem+json → ApiError
├─ services/                   Funciones de negocio: getProducts(), quoteCart(), createOrder()…
├─ react/                      Hooks de TanStack Query (subpath @galpon/api-client/react)
└─ mock/
   ├─ fixtures/                Datos del diseño: 6 líneas, 27 productos, reseñas, FAQ, contenidos, ajustes
   │                           (en P1 se garantiza que se pueden serializar a JSON, con un test; la
   │                           exportación a JSON para el seed se hace en la fase 2)
   ├─ db.ts                    Base en memoria (singleton en globalThis.__galponMockDb)
   ├─ handlers/                Un handler por endpoint, con los mismos schemas que usará el back
   └─ mock-fetch.ts            fetch(request: Request) que enruta al handler (lee el body con request.json())
```

### 13.2 Cómo se conecta cada app

| | Modo prueba (`mock`) | Modo vivo (`live`) |
|---|---|---|
| Tienda · Server Components | `mockFetch` en el mismo proceso (misma `db`) | `API_BASE_URL` directo |
| Tienda · navegador | `/api/v1/*` → *rewrite* a `/api/mock/v1/*` (route handler con `mockFetch`) | `/api/v1/*` → *rewrite* a `API_BASE_URL/api/v1/*` (mismo dominio, sin CORS, cookie propia) |
| Admin (SPA) | `mockFetch` en el navegador; `db` y sesión simulada en `sessionStorage` (sobreviven a recargas) | `VITE_API_BASE_URL` con `credentials: 'include'` |

- El navegador de la tienda **siempre** habla con `/api/v1` en su mismo dominio; solo cambia el destino del *rewrite*.
- El mock simula latencia (150–400 ms), errores de validación reales, `401`, `409` de stock/precio/total, y los resultados de pago **como el sandbox de MP: por el nombre del titular** (`APRO` aprobado, `CONT` pendiente, `OTHE` rechazado, `FUND` fondos insuficientes, `SECU` CVC inválido, `EXPI` vencida, `CALL` hay que autorizar con el banco y `3DS` abre el desafío 3-D Secure simulado; DNI de prueba 12345678). La tabla está en el README de `api-client`.
- Para armar escenarios, el mock tiene rutas de control fuera del contrato (`MOCK_CONTROL_ROUTES`, solo en modo de prueba): `POST /__mock/orders/{number}/expire` vence la reserva de un pedido y `POST /__mock/products/{id}` cambia el precio o el stock de un producto; el simulador de Mercado Pago resuelve el pago con `POST /__mock/mercadopago/resolve`.
- En modo de prueba, `initPoint` apunta a `/checkout/mp-simulado?pedido=…`: una página con botones Aprobar / Dejar pendiente / Rechazar que redirige a `/checkout/resultado` como lo haría MP.
- Tienda y admin no comparten datos simulados (procesos distintos): un cambio en el admin no se ve en la tienda hasta que exista el back. Documentado en el README.

### 13.3 Variables de entorno (validadas con Zod al arrancar; si falta una, la app no levanta)

| App | Variable | Uso |
|---|---|---|
| store | `API_MODE` (`mock`/`live`) | Destino del cliente del servidor y del *rewrite* |
| store | `NEXT_PUBLIC_API_MODE` | El navegador elige Secure Fields reales o campos simulados |
| store | `API_BASE_URL` | Solo en `live` |
| store | `REVALIDATE_SECRET` | `/api/revalidate` |
| store | `NEXT_PUBLIC_MP_PUBLIC_KEY` | Solo en `live` |
| store | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Loader de imágenes |
| store | `NEXT_PUBLIC_SITE_URL` | URLs absolutas (SEO, sitemap) |
| store, admin | `MOCK_LATENCY_MS` / `VITE_MOCK_LATENCY_MS` | Latencia simulada del mock (por defecto 150–400 ms; `0` para medir rendimiento) |
| admin | `VITE_API_MODE`, `VITE_API_BASE_URL`, `VITE_STORE_URL` | Modo, API y link a la tienda |
| admin | `VITE_MOCK_ADMIN_EMAIL`, `VITE_MOCK_ADMIN_PASSWORD` | Solo modo de prueba |

### 13.4 Pasar a vivo

Cambiar variables de entorno y volver a compilar: `API_MODE`/`NEXT_PUBLIC_API_MODE`/`VITE_API_MODE` a `live` y completar `API_BASE_URL`, `VITE_API_BASE_URL`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `REVALIDATE_SECRET`. Sin cambios de código.

## 14. Checkout y pagos con Mercado Pago

### 14.1 Pasos y textos

Título "Finalizá tu compra". Barra de pasos 01 Contacto · 02 Envío · 03 Pago, clicable solo hacia atrás. "Volver" / "Continuar". Validación al avanzar: el primer campo con error tiembla y recibe el foco. Al cambiar de paso, scroll suave arriba. Si el carrito está vacío: "Tu carrito está vacío." + "Ir a la tienda".

1. **Contacto**: email ("vos@ejemplo.com"), nombre, apellido, teléfono opcional ("para el correo"), "Te enviamos la confirmación y el seguimiento a este email." Con sesión, se completan solos.
2. **Envío**: opciones con plazo y costo; "Costos fijos por método; el valor final se confirma antes de pagar."; campos de dirección según el método (con sesión, elegir una dirección guardada). Retiro: "Sin costo. Cuando confirmemos el pago te escribimos a {email} para coordinar día, horario y lugar de retiro."
3. **Pago**: "Mercado Pago — Tarjetas, dinero en cuenta y más" o "Tarjeta de crédito o débito — Visa, Mastercard, American Express". Con MP: "Te llevamos a Mercado Pago para completar el pago de forma segura y volvés acá con la confirmación." Nota: "Pago procesado por Mercado Pago. No guardamos los datos de tu tarjeta." **Antes del botón**, en texto destacado: "Tenés 10 días corridos desde que recibís el producto para arrepentirte de la compra, sin costo. [Botón de arrepentimiento]" y "Al pagar aceptás los [Términos] y la [Política de privacidad]".
- Botón final: "Pagar $X con Mercado Pago" / "Pagar $X" (X = total confirmado por el back); en curso: "Conectando con Mercado Pago…" / "Procesando pago seguro…".
- Resumen lateral "Tu pedido": líneas (nombre × cantidad, detalle, total), "Ahorro por kit", "Subtotal", envío ("Se calcula en el paso 2" antes de elegir; "Gratis" si cuesta 0), "Total". Los importes vienen de `POST /cart/quote` al entrar y al cambiar el carrito.
- Contacto y envío se guardan en `sessionStorage` (no se pierden al recargar). Los datos de tarjeta nunca se guardan.

### 14.2 Flujo

```
Paso 3: el cliente elige el medio de pago (Mercado Pago o tarjeta)
  │
  ▼
POST /orders { …, expectedTotalArs }  (Idempotency-Key)
  │   el back valida, recalcula precios/stock/kit/envío, reserva stock 30 min
  │   ├─ 409 stock/price/total_changed → se muestra qué cambió, se actualiza el resumen, se confirma de nuevo (sin cobrar)
  │   └─ 201 { order, orderToken } → sessionStorage { number, orderToken, cartHash }
  │
  ▼
"Pagar"  (solo crea la preferencia de MP, o el token de la tarjeta y el pago)
  │
  ├── Mercado Pago ─► POST …/preference ─► redirección a initPoint ─► el cliente paga en MP
  │                                                  └─► vuelve a /checkout/resultado?pedido=GLP-12345
  │
  └── Tarjeta ─► Secure Fields (14.4) ─► createCardToken ─► POST …/card ─┬─► { paymentStatus }
                                                                         └─► challenge.url → 3-D Secure (14.4)
                                                                                └─► /checkout/resultado
```

- **El pedido se crea al elegir el medio de pago, no al tocar "Pagar"** (decisión tomada al construir el checkout en P3): las cuotas necesitan el total confirmado por el back y el número del pedido, y así la reserva de 30 minutos cubre tanto Mercado Pago como la tarjeta. Mientras `cartHash` y los datos de los pasos 1 y 2 no cambien se reutiliza el pedido; si cambian, se crea uno nuevo con otra `Idempotency-Key`.

- **El pedido solo pasa a pagado cuando el back lo confirma con la notificación de Mercado Pago.** Los parámetros de la redirección no prueban nada.
- El token del pedido viaja en la cabecera `X-Order-Token`, nunca en la URL; la URL de regreso lleva solo el número.
- **Un intento de pago activo por pedido**: al iniciar uno nuevo, el back cancela la preferencia o el pago pendiente anterior. Si igual llega un segundo pago aprobado, se marca para devolver y aparece como alerta en el admin.
- "Probar con otro medio" reutiliza el pedido si `cartHash` no cambió y no venció; si no, crea uno nuevo.

**`/checkout/resultado`** consulta `GET /orders/{number}` con el token de `sessionStorage`:

| `paymentStatus` | Pantalla |
|---|---|
| `approved` | "¡Gracias, {nombre}!" con check dibujado, "Tu pedido GLP-12345 está confirmado. Te enviamos el detalle a {email}…", líneas, envío, medio y total, "Seguir comprando". Vacía el carrito |
| `pending` | "Estamos esperando la confirmación del pago" (consulta cada 5 s); a los 2 min: "Te avisamos por mail apenas se acredite" + número de pedido |
| `action_required` | Retoma la verificación 3-D Secure (con la dirección del desafío que el checkout dejó en `sessionStorage` de la pestaña, porque `Order.payment` no la trae; sin ella ofrece "Pagar de nuevo") |
| `rejected` | Motivo legible en español (según `statusDetail`) + "Probar con otro medio" |
| `none` / `cancelled` (pedido pendiente) | "No completaste el pago" + "Pagar" (vuelve al paso 3 reutilizando el pedido, que sigue reservado) |
| pedido `expired` (`status: expired`, con cualquier `paymentStatus`) | "El pedido venció" + "Volver al carrito" (solo con `status: expired`: después de cancelar un intento el pedido sigue reservado y se puede pagar) |
| sin token o inválido | "No encontramos ese pedido" (sin revelar si existe) |

### 14.3 Estados de pago (normalizados en el contrato)

`paymentStatus`: `none` · `pending` · `action_required` · `approved` · `rejected` · `cancelled` · `refunded` · `partially_refunded` · `in_dispute` · `charged_back`. El back traduce los estados de Mercado Pago a este enum (p. ej. `authorized`, `in_process` → `pending`; `pending_challenge` → `action_required`; `in_mediation` → `in_dispute`). Qué API de MP usa el back (Orders, que MP recomienda para integraciones nuevas, o Payments/Preferences) y la tabla de mapeo completa se fijan en el ADR 0004.

Datos que el back manda a MP (fase 2, documentado en el ADR 0004): `external_reference` = número de pedido, `statement_descriptor` "GALPON MATES", `notification_url`, `back_urls` → `/checkout/resultado?pedido=…` (las tres), `auto_return: 'approved'`, vencimiento de la preferencia = vencimiento de la reserva (30 min), exclusión de `ticket` y `atm` (D3), `X-Idempotency-Key` en cada pago.

### 14.4 Formulario de tarjeta (Secure Fields)

**Secuencia** (MercadoPago.js v2):

1. `mp.fields.create('cardNumber' | 'expirationDate' | 'securityCode', { placeholder, style })` con estilos del diseño.
2. `binChange { bin }` → `mp.getPaymentMethods({ bin })` → marca, `paymentTypeId` (crédito/débito) y `settings` → `field.update({ settings })` (largo del número y del CVC, 4 en Amex). Si `bin` es `null`: se limpian marca, emisor y cuotas.
3. Si hace falta emisor: `mp.getIssuers({ paymentMethodId, bin })`.
4. Crédito: `mp.getInstallments({ amount, bin, paymentTypeId })` con el total confirmado (pesos). Débito: no se muestra el selector de cuotas.
5. `mp.getIdentificationTypes()` alimenta el selector de tipo de documento (DNI por defecto).
6. "Pagar": `mp.fields.createCardToken({ cardholderName, identificationType, identificationNumber })`. El token es de un solo uso: se genera uno nuevo en cada intento.
7. Si la respuesta trae `challenge.url`: se abre en un iframe dentro de un diálogo accesible ("Verificá tu compra con tu banco"); al terminar se consulta el estado del pedido.

**Errores y accesibilidad**: cada campo seguro va en un contenedor con `<label>` visible y un mensaje propio en `aria-live="polite"`, alimentado por los eventos de validez de MP: "Número incompleto", "Vencimiento inválido", "CVC inválido". El foco al campo con error usa el método `focus` del campo de MP, y el temblor se aplica al contenedor.

**Tarjeta animada del diseño**: muestra la marca, el BIN seguido de `••••`, el nombre del titular y gira al enfocar el CVC. El vencimiento y el CVC muestran fijos "MM/AA" y "•••" porque los dígitos viven dentro de los iframes de MP.

**Cuotas y CFT** (Res. SIyC 4/2025 y pautas de MP para Argentina):

- Cada opción se arma con lo que devuelve MP (`payer_costs`: cantidad, monto de cuota, total, `labels` con CFT y TEA): "3 cuotas de $22.799 · Total $68.397 · CFT 0,00 % (TEA 0,00 %)". **"Sin interés" solo si el CFT es 0.** El CFT se muestra destacado, con letra mayor que la TEA.
- En la ficha y la tarjeta: "o 3 cuotas sin interés de $13.333 · CFT 0,00 % (TEA 0,00 %)", solo si `installments.showOnProduct` y `maxWithoutInterest > 1`. El ajuste del admin indica: "Tiene que coincidir con las promociones configuradas en tu cuenta de Mercado Pago". Monto de cuota informativo = `round(precio / N)`.

**Modo de prueba**: campos simulados con la misma interfaz, que deciden el resultado por el nombre del titular (13.2) y nunca salen del navegador.

### 14.5 Precio sin impuestos nacionales (Ley 27.743)

Si `priceDisplay.showNetPrice` está activo, cada precio de venta a consumidor final (tarjeta, ficha, carrito y resumen) muestra debajo, en letra menor, "Precio sin impuestos nacionales: $X" (`netPriceArs`, calculado por el back según la condición fiscal y la alícuota configuradas). En la cotización del carrito cada línea trae `netUnitPriceArs` y el total trae `netSubtotalArs`; el neto por unidad se calcula sobre el precio efectivo del kit, con el ahorro por kit ya descontado (`totalArs` de la línea dividido por la cantidad) y no sobre el precio de lista de las piezas, y `netSubtotalArs` sobre el subtotal ya con ese ahorro. Se deja configurable y marcado para que lo confirme el contador del cliente.

### 14.6 Información obligatoria del vendedor

En el pie y en Contacto, editable desde Ajustes: razón social o nombre completo, CUIT, condición fiscal, domicilio, teléfono o canal alternativo, área responsable y horario de atención (no menor a 8 h en días hábiles si la atención es solo electrónica; Disp. 954/2025 art. 6), QR/link de Data Fiscal (ARCA, F. 960). Páginas `/terminos` y `/privacidad` (contenido editable). Aviso breve de privacidad con link en cada formulario que pide datos. Link a Defensa del Consumidor como contenido opcional. En la ficha, "Cambios" (10 días, sin uso) y "Arrepentimiento" (10 días corridos, sin causa y sin costo) se explican por separado. **Todos los textos legales se marcan para revisión de un profesional antes de salir a producción.**

## 15. Validaciones (`packages/schemas`)

Mismas reglas en la tienda, el admin, el mock y (fase 2) los DTOs del back NestJS, verificadas con un archivo compartido de casos de validación (`docs/api/validation-cases.json`) que corren los tests de los dos repos. Los textos se recortan antes de validar. Los mensajes respetan los del diseño; los nuevos están marcados con *.

| Campo | Regla | Mensaje |
|---|---|---|
| Email | formato válido, ≤ 254, se guarda en minúsculas | "Ingresá un email válido" |
| Nombre / apellido (checkout) | 2–50; letras con acentos y ñ, espacios, apóstrofo, guion | vacío: "Requerido" · formato: "Usá solo letras"* |
| Teléfono (opcional) | acepta espacios, guiones y `+54 9`; normalizado a 10 dígitos sin 0 ni 15 | "Ingresá el código de área y el número, sin 0 ni 15"* |
| Calle | 2–80 | "Requerido" |
| Número | 1–5 dígitos o "S/N" | "Requerido" |
| Piso / depto (opcional) | ≤ 10 | — |
| Código postal | `^[A-Za-z]?\d{4}[A-Za-z]{0,3}$`, se guarda en mayúsculas | "Código postal inválido" |
| Ciudad | 2–60 | "Requerido" |
| Provincia | una de las 24 jurisdicciones | "Elegí una provincia" |
| Titular de tarjeta | 2–60 | "Como figura en la tarjeta" |
| Documento | DNI: 7–8 dígitos (sin puntos); otros tipos según `getIdentificationTypes` | "DNI inválido" |
| Tarjeta (Secure Fields) | validez informada por MP | "Número incompleto" · "Vencimiento inválido" · "CVC inválido" |
| Reseña: estrellas | entero 1–5 | "Elegí una puntuación de 1 a 5 estrellas." |
| Reseña: nombre (opcional) | ≤ 40; vacío → "Anónimo" | — |
| Reseña: texto | 10–600 | "Contanos un poco más (mínimo 10 caracteres)" |
| Contacto: nombre | 2–50 | "Contanos tu nombre" |
| Contacto: mensaje | 10–2000 (placeholder "Contanos qué pasó o qué necesitás") | "Escribí al menos 10 caracteres" |
| Contacto / arrepentimiento: n° de pedido (opcional) | `^GLP-\d{5}$` | "El número tiene el formato GLP-12345"* |
| Contacto: motivo | Pedido, Envío, Cambio, Arrepentimiento, Otro | — |
| Campo trampa `website` | debe llegar vacío | (se descarta en silencio) |
| Cantidad | entero 1 a `min(20, stock)` | — |
| Cuenta: contraseña | 10–128, al menos una letra y un número | "Mínimo 10 caracteres, con letras y números"* |
| Admin · producto: nombre | 3–120 | * |
| Admin · producto: slug | `^[a-z0-9]+(?:-[a-z0-9]+)*$`, ≤ 80, único | "Solo minúsculas, números y guiones"* |
| Admin · producto: precio | entero > 0 en pesos, o "a consultar" | * |
| Admin · producto: stock | entero 0–9999 | * |
| Admin · producto: descripción | 10–2000 | * |
| Admin · fotos | ver 11.4; texto alternativo 3–120 | * |
| Admin · descuento del kit | entero 0–30 | * |
| Admin · costo de envío | entero ≥ 0 en pesos | * |
| Admin · cuotas sin interés | entero 1–12 | * |
| Admin · despacho | empresa 2–40, seguimiento 4–40 | * |
| Admin · CUIT | 11 dígitos con dígito verificador válido | "CUIT inválido"* |

Los errores aparecen al salir del campo y al intentar avanzar (no mientras se escribe por primera vez), con `aria-invalid` y `aria-describedby` en los campos propios (los de MP, ver 14.4). El color de error es el del diseño (sección 7).

## 16. Seguridad del frontend

- Variables de entorno validadas al arrancar; al navegador llegan solo las `NEXT_PUBLIC_*` / `VITE_*` de la tabla 13.3.
- **CSP de la tienda** (en `headers()` de `next.config`, sin nonce para conservar el render estático):
  `default-src 'self'` · `script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://*.mercadopago.com https://*.mlstatic.com` (+ `'unsafe-eval'` solo en desarrollo) · `style-src 'self' 'unsafe-inline'` · `img-src 'self' data: blob: https://res.cloudinary.com https://*.mlstatic.com https://*.mercadopago.com` · `font-src 'self'` · `connect-src 'self' https://api.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com` · `frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com https:` (el desafío 3-D Secure carga páginas del banco; `'self'` es para el simulador del modo de prueba, que es una página de la tienda) · `object-src 'none'` · `base-uri 'self'` · `form-action 'self' https://*.mercadopago.com` · `frame-ancestors 'none'` (solo `/checkout/mp-simulado` lleva `frame-ancestors 'self'`, porque el 3-D Secure simulado la abre en un iframe del mismo origen; ver `src/lib/csp.ts`) · `upgrade-insecure-requests`.
- **CSP del admin** (estricta; la SPA no tiene scripts inline): `default-src 'self'` · `script-src 'self'` · `style-src 'self' 'unsafe-inline'` · `img-src 'self' data: blob: https://res.cloudinary.com` · `connect-src 'self' {VITE_API_BASE_URL} https://api.cloudinary.com` · `frame-ancestors 'none'`. Se aplica en el servidor que sirva el admin (documentado en su README) y en `vite preview` para los tests.
- Además, en las dos: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva (`payment` solo para MP).
- Los E2E fallan si aparece una violación de CSP en la consola.
- Nada de HTML crudo: los textos editables se renderizan como texto con párrafos.
- Sesiones solo en cookies `httpOnly` con prefijo `__Host-`; en `localStorage` solo IDs y cantidades del carrito; en `sessionStorage` el token del pedido y los datos de contacto/envío del checkout.
- `/api/revalidate` con secreto compartido y comparación en tiempo constante.
- Campo trampa en formularios públicos; el rate limiting es del back.
- Nada personal en la URL.

## 17. Animaciones

Componentes en `components/motion/` (tienda), configurables, documentados y reducidos a un fundido (o desactivados) con `prefers-reduced-motion: reduce`. **Se prefieren** `transform`, `opacity`, `clip-path` y `filter`. Excepciones permitidas: acordeón de preguntas (`grid-template-rows` 0fr↔1fr), anillos de muestras y opciones (transición de `box-shadow`), rebote del contador (color de fondo), punto de stock (`box-shadow`). Las barras de reseñas usan `scaleX` (equivalente al `width` del diseño). Los efectos de mouse se desactivan si el puntero no es mouse.

**Etapa 1** (junto con cada pantalla)

| Efecto | Componente | Dónde |
|---|---|---|
| Aparición al entrar en pantalla (`up`, `rise`, `fade`, `scale`, `left`, `clip`, `bar`) con retardo y duración | `Reveal`, `RiseText` | Todo el sitio |
| Entrada del contenido en cada navegación (desenfoque + 24 px, 800 ms, 180 ms de retraso; también si cambia solo el parámetro) | `PageEnter` | Todo el sitio |
| Cortina con el logo al cambiar de página | `PageCurtain` | Todo el sitio |
| Inclinación 3D con el mouse (10°) | `Tilt` | Tarjetas, fotos, reseñas |
| Botones magnéticos | `Magnetic` | CTAs |
| Contadores animados (1800 ms, con decimales) | `CountUp` | Cifras, promedio de reseñas |
| Texto que se ilumina por palabra con el scroll | `ScrubText` | Manifiesto, Nosotros |
| Flotación suave | `Float` | Ilustraciones, kit |
| Producto que vuela al carrito + rebote del contador | `FlyToCart` | Agregar al carrito |
| Colección horizontal fija con progreso | `HorizontalScroll` | Inicio |
| Reaparición escalonada de la grilla (45 ms por tarjeta) | `GridReplay` | Tienda |
| Fundido al cambiar de pestaña | `TabFade` | Producto |
| Punto que late | `Ping` | Stock |
| Parallax con el mouse | `MouseParallax` | Nosotros |
| Check que se dibuja | `DrawCheck` | Confirmaciones |
| Temblor del campo con error | `Shake` | Formularios |
| Header de vidrio y barra de progreso | `Header` | Todo el sitio |
| Parallax de títulos de fondo | en la sección | Inicio |
| Scroll suave arriba al cambiar de paso | hook `useScrollTopOnStep` | Kit, checkout |

**Etapa 2**

- Escena 3D del mate con three.js que recorre las 7 escenas del inicio según el scroll (porta `docs/design/galpon-tienda-v3/mate3d-scene.js`; keyframes tipados como tuplas): carga diferida, reemplazo por foto si no hay WebGL o se pide menos movimiento.
- Cursor propio (`cursor-default.png`, `cursor-pointer.png`) y brillo que sigue al mouse.
- Muestras de cuero que cambian de nombre con el scroll en la escena 6.

## 18. Accesibilidad y rendimiento

- WCAG 2.2 AA: teclado completo, foco visible, diálogos (carrito, búsqueda, menú, 3-D Secure) con trampa de foco y Escape, contraste verificado sobre el fondo oscuro y sobre el crema, textos alternativos obligatorios.
- Lighthouse en celular (build de producción, modo de prueba con `MOCK_LATENCY_MS=0`): Rendimiento ≥ 85 en el inicio y ≥ 90 en tienda y producto; Accesibilidad, Buenas prácticas y SEO ≥ 95.
- Imágenes con `next/image` + Cloudinary; fuentes con `next/font`; three.js y Motion se cargan solo donde se usan (`motion/react-m` + `LazyMotion`).

## 19. Tests

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitarios | Vitest | `domain` (dinero y formato, kit, totales, cantidad máxima entre líneas, envío, relacionados, búsqueda, fechas), `schemas` (cada regla con casos válidos e inválidos y sus mensajes), `api-client` (errores, handlers del mock) |
| Componentes | Vitest + Testing Library | Formularios y errores, carrito y conciliación, asistente del kit, cuero/virola, QuantityStepper, acordeón, formularios y tablas del admin |
| Punta a punta | Playwright (Chromium escritorio + Pixel 7) | Compra como invitado con MP (aprobada, pendiente, rechazada) y con tarjeta (APRO, OTHE), compra con cuenta, 409 de total cambiado, `/kit?mate=`, búsqueda con Enter, contacto, arrepentimiento con código, login del admin, crear/editar/archivar producto, despachar un pedido, aprobar y destacar una reseña; sin violaciones de CSP |
| Accesibilidad | `@axe-core/playwright` | Inicio, tienda, producto, kit, checkout, contacto, arrepentimiento, login y productos del admin: sin violaciones serias ni críticas |
| Manual antes de producción | Credenciales de prueba de MP | Secure Fields reales, cuotas con CFT, 3-D Secure, Checkout Pro de punta a punta |

`domain` y `schemas` se escriben con test primero.

## 20. Calidad, automatización y documentación

- Scripts en `frontend/package.json`: `dev` (tienda y admin juntos), `dev:store`, `dev:admin`, `build`, `typecheck` (tienda: `next typegen && tsc --noEmit`; admin: `tsr generate && tsc --noEmit`), `lint` (chequeo de versiones fijadas + ESLint), `format`, `format:check`, `test`, `test:coverage`, `test:e2e`, `api:lint`, `api:generate`, `api:check`.
- `lefthook.yml` en la raíz del repo (que es la del workspace): en `pre-commit`, Prettier + ESLint sobre lo cambiado; en `pre-push`, `typecheck` (antes de que Lucas suba, y así los commits siguen siendo rápidos). Se instala con `"prepare": "lefthook install"` al correr `npm install`.
- Commits convencionales en español (`feat(store): agrega carrito lateral`).
- CI (`.github/workflows/ci.yml`, Node 24, `npm ci`): `api:lint`, `api:check` (falla si los tipos difieren de lo commiteado), `lint`, `typecheck`, `test:coverage`; y en un segundo job, `build` y `test:e2e`. Corre cuando Lucas suba el repo a GitHub.
- `.editorconfig`, `.nvmrc` y `.env.example` por app con cada variable explicada.
- **Documentación**: `README.md` raíz (requisitos, levantar en modo de prueba en 3 comandos, mapa); `README.md` por app, paquete y funcionalidad; TSDoc en todo lo exportado; ADRs en `docs/adr/`:
  `0001` Next para la tienda y Vite para el admin · `0002` Contrato OpenAPI como fuente de verdad · `0003` Modo de prueba (mock en el servidor de Next, *rewrite* de mismo dominio) · `0004` Mercado Pago: API elegida, mapeo de estados, campos de preferencia, 3-D Secure, idempotencia · `0005` Cloudinary con subida firmada · `0006` Montos en pesos enteros · `0007` Opciones de TypeScript, versiones fijadas (TS 6, ESLint 9, jsdom 29), npm workspaces y avisos conocidos de `npm audit`. El índice está en `docs/adr/README.md`; el recorrido de P1, en `docs/BITACORA.md`.

## 21. Entrega

### 21.1 Cinco planes de implementación

Cada plan tiene su propio documento, sus tareas y su criterio de "listo"; termina con `typecheck`, `lint` y tests en verde y commits.

| Plan | Contenido | Listo cuando |
|---|---|---|
| **P1 · Fundaciones y contrato** | Repo, workspace npm con versiones exactas centralizadas, `config`, `design-tokens`, `domain` y `schemas` (con tests), `openapi.yaml` completo, `api-client` + mock + fixtures, esqueleto de las dos apps que arrancan con la API simulada, lefthook, CI, README, ADRs | Las dos apps arrancan en modo de prueba, CI en verde, `domain` y `schemas` con cobertura completa de las reglas |
| **P2 · Tienda pública** | Layout (barra superior, header, menú, pie, toast), `components/ui`, Inicio (sin 3D), Tienda, Producto, Reseñas, Búsqueda, Carrito, Kit, Nosotros, Preguntas, Contacto, Arrepentimiento, Legales, SEO, animaciones de la etapa 1 | Lista de control visual de esas pantallas aprobada; E2E de navegación, carrito, kit, búsqueda, contacto y arrepentimiento |
| **P3 · Checkout y cuenta** | Checkout de 3 pasos, cotización, pedidos, simulador de MP, tarjeta con Secure Fields y campos simulados, 3-D Secure, resultado, pedido de invitado, cuenta de cliente | E2E de todos los caminos de compra en verde |
| **P4 · Dashboard** | Sesión, resumen, productos con fotos, líneas, pedidos, contenido, ajustes, reseñas, mensajes | E2E del admin en verde; lista de control del admin |
| **P5 · Etapa 2 y cierre** | Escena 3D, cursor y brillo, Lighthouse, accesibilidad, revisión visual final, README finales | Objetivos de la sección 18 cumplidos |

### 21.2 Lista de control visual

Para cada pantalla, a 1440 px y 390 px, contra capturas del diseño exportado (se toman al empezar P2 sirviendo `docs/design/galpon-tienda-v3/` por HTTP local): estructura y orden de bloques, textos, colores y tipografía, espacios, estados (vacío, error, hover, foco), animaciones presentes y comportamiento al tocar o hacer clic. Las diferencias aceptadas quedan anotadas (por ejemplo D9 o la tarjeta animada sin dígitos).

## 22. Pendientes para la fase 2 (backend y base de datos)

Ver `docs/superpowers/specs/2026-10-20-galpon-backend-design.md`: NestJS hexagonal (monolito modular), PostgreSQL + Prisma, Redis + BullMQ, Mercado Pago (Stripe en una fase posterior por el mismo puerto), idempotencia en pedidos y pagos, webhooks con verificación de firma, Swagger igual al contrato del front, seed desde los fixtures (la exportación de los fixtures a JSON se hace en esta fase), llamadas a `/api/revalidate`.

## 23. Riesgos y supuestos

| Riesgo o supuesto | Mitigación |
|---|---|
| El contrato cambia al diseñar el back | Cambio en el YAML → `api:generate` → TypeScript marca cada lugar afectado |
| Solo un producto (Mate Imperial Premium) tiene foto real en el diseño; los otros 26 no | Placeholder del diseño (marco con borde punteado, ícono de imagen y el nombre del producto) hasta que se carguen desde el admin |
| Datos simulados de tienda y admin no compartidos | Documentado; se resuelve con el back real |
| La escena 3D pesa en celulares viejos | Carga diferida, reemplazo por foto, objetivo de rendimiento propio |
| Normativa (arrepentimiento, precios, cuotas, datos del vendedor, privacidad) | Implementado según Disp. 954/2025, Ley 27.743 y Res. SIyC 4/2025; todo editable y marcado para revisión profesional |
| Condición fiscal del cliente (afecta "precio sin impuestos nacionales") | Configurable en Ajustes; lo confirma su contador |
| Versiones nuevas de TS (7) y ESLint (10) | Fijadas en TS 6 y ESLint 9 con ADR; se revisa al salir TS 7.1 y el soporte de los plugins |
| Nombre real del segundo socio y datos de contacto | Editables desde el admin; arrancan con los del diseño |
