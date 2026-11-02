# P2 · Tienda pública — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plasmar el diseño "Galpón Tienda v3" en `apps/store`: layout, componentes, animaciones de la etapa 1 y todas las pantallas públicas, salvo el checkout (P3) y la escena 3D (P5), funcionando en modo de prueba.

**Architecture:** Pantallas en `apps/store/src/app/**` (rutas cortas que componen piezas de `features/*`). Cada funcionalidad es una carpeta cerrada que solo se importa por su `index.ts`. Componentes sin negocio en `components/ui`, animaciones reutilizables en `components/motion` y layout en `components/layout`. Las lecturas se hacen en el servidor con `lib/data/*` (`'use cache'` + etiquetas). Lo interactivo son Client Components que usan `getBrowserApi()` y TanStack Query.

**Tech Stack:** Next.js 16.4 (App Router, Cache Components) · React 19.3 · Tailwind 4.3 + `@galpon/design-tokens` · `motion` 14.4 · Zustand 5 · `@phosphor-icons/react` 2.1 · Vitest + Testing Library · Playwright.

**Spec:** `docs/superpowers/specs/2026-10-19-galpon-frontend-design.md` (secciones 7, 8, 9, 10, 14.5, 14.6, 16, 17, 18). **Diseño:** `docs/design/galpon-tienda-v3/` (`body.html`, `dc-script.js`, `ProductCard.dc.html`) y las capturas que genera la Task 1 en `docs/design/galpon-tienda-v3/screens/`.

## Global Constraints

- Las mismas de P1 (`docs/superpowers/plans/2026-10-20-p1-fundaciones-y-contrato.md`): npm workspaces, versiones exactas de `scripts/dependency-versions.json`, TS estricto, sin `any`/`console`/`!`/`dangerouslySetInnerHTML`, TSDoc en español, solo commits locales y sin push, no tocar `../backend`.
- **Fidelidad**: cada pantalla replica la captura del diseño (estructura, textos, colores, tipografía, espacios y estados) a 1440 px y 390 px. Los únicos desvíos permitidos son los del spec: barra superior de arrepentimiento (D9), rutas reales, solo la tarjeta Vitrina, placeholders sin foto, precio sin impuestos nacionales y CFT, y "Compra verificada" solo si es verdad.
- **Textos**: los visibles salen del contenido de la API (`HomeContent`, `AboutContent`, `FaqContent`, `FooterContent`, `ProductTabsContent`, `LegalContent`, `PublicSettings`); los microtextos de interfaz (por ejemplo "Ver detalle" o "Agregar al carrito") van en constantes `*.copy.ts` de cada feature, en español y tal como están en el diseño.
- **Desacople**: una feature no importa archivos internos de otra (lint). Las reglas de negocio se usan desde `@galpon/domain`; ningún componente recalcula precios, kit, cuotas ni stock a mano.
- **Accesibilidad**: navegación por teclado, foco visible, diálogos con trampa de foco y Escape, `prefers-reduced-motion` respetado en cada animación, imágenes con `alt`.
- **Rendimiento**: Server Components por defecto; `'use client'` solo donde hay interacción o animación. `motion` se usa con `LazyMotion` + `m`.
- **Trabajo en paralelo**: cada task declara las carpetas de las que es dueña. Un agente solo hace staging de esas rutas, corre solo sus tests (`npx vitest run --project store <ruta>`, `npm run typecheck -w @galpon/store`, `npx eslint <rutas>`) y nunca toca `package.json`, `package-lock.json` ni `vitest.config.ts`; eso lo prepara el controlador antes de cada ola.

## Review Focus

1. Carrito con datos viejos en `localStorage` (un producto borrado, otro sin stock, otro con stock menor a la cantidad): se concilia según la tabla del spec §9.4 sin romper la página → test en la Task 5.
2. Doble clic rápido en "Agregar al carrito" o "Agregar kit": nunca supera `remainingQuantityFor` → test en las Tasks 5 y 9.
3. `/producto/<slug-inválido>` (mayúsculas, `..`, `%`) responde `notFound()` y no un error 500 (`getProduct` lanza `RangeError`) → test en la Task 8.
4. Usuario con `prefers-reduced-motion: reduce`: el contenido igual aparece (nada queda invisible esperando una animación) → test en la Task 3 y en el E2E de la Task 11.
5. Búsqueda con Enter, sin resultados o con un solo resultado, y `/tienda?q=` con texto raro (`<script>`, emojis): se muestra como texto y la URL se codifica → tests en las Tasks 8 y 9.

---

## Ola 0 (en paralelo; antes, el controlador prepara dependencias)

**Preparación del controlador** (un commit, antes de la ola):
- Agregar a `apps/store/package.json` (versiones exactas): `motion`, `zustand`, `@phosphor-icons/react` y, como devDependencies, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom` y `jsdom`.
- En `vitest.config.ts`, el proyecto `store` incluye `src/**/*.test.{ts,tsx}` con `setupFiles: ['./src/test/setup.ts']` (jest-dom). Los tests de componentes declaran `// @vitest-environment jsdom`.
- `npm install` y commit.

### Task 1: Capturas del diseño (referencia visual)

**Dueño:** `docs/design/galpon-tienda-v3/screens/**`, `docs/design/galpon-tienda-v3/galpon-mates-bundle.html`, `scripts/capture-design.mjs`.

- Copiar el bundle original (`C:\Users\lucas\Downloads\Galpon Mates.html`) a `docs/design/galpon-tienda-v3/galpon-mates-bundle.html`.
- `scripts/capture-design.mjs` (Playwright, JS sin dependencias nuevas). Abre el bundle por `file://`, navega a cada ruta del diseño (`#/inicio`, `#/tienda`, `#/tienda/bombillones`, `#/producto/imperial-premium`, `#/producto/galleta`, `#/kit`, `#/nosotros`, `#/faq`, `#/contacto`) y también el carrito abierto (con 1 producto y 1 kit agregados), la búsqueda abierta y el menú móvil.
  - Recorre la página con scroll para disparar las apariciones y espera a que terminen.
  - Guarda capturas de página completa a 1440×900 y 390×844 como `screens/<pantalla>-<1440|390>.png`, más capturas del viewport para el inicio por escena (`home-scene-<0..6>-1440.png`).
- Script npm raíz: `"design:capture": "node scripts/capture-design.mjs"`. No va en CI.
- Verificación: existen las PNG y se ven bien (abrir 3 al azar).

### Task 2: Componentes de interfaz (`components/ui`)

**Dueño:** `apps/store/src/components/ui/**`.

**Produce** (cada uno con TSDoc, props tipadas y `index.ts`):
- `Button` (variantes `primary` | `secondary` | `ghost`, tamaños, `asChild` para links, `loading`), `IconButton` (36×36, `aria-label` obligatorio)
- Campos: `Input`, `Textarea`, `Select`, `Field` (label + error con `aria-describedby` y `aria-invalid`), `Segmented` (radio group accesible)
- `Tag` (`accent` | `accent2` | `neutral` | `outline`), `Stars` (valor 0–5 con medias, solo lectura, `aria-label` "4,7 de 5")
- `Price` (usa `formatPesos`; `null` → "Consultar"), `NetPrice` ("Precio sin impuestos nacionales: $X", spec §14.5), `InstallmentsNote` (spec §14.4: "o N cuotas sin interés de $X · CFT 0,00 % (TEA 0,00 %)", con el CFT destacado; no se muestra si `showOnProduct` es falso o `max ≤ 1`)
- `QuantityStepper` (mínimo 1, máximo por prop, "−" deshabilitado en 1 salvo que `onRemove` exista), `Swatch` (cuero con anillo de selección)
- `ImageWithPlaceholder` (`next/image`; sin imagen, el placeholder del diseño: marco punteado con el ícono de imagen y el nombre del producto), `Spinner`, `Dialog` (modal accesible: trampa de foco, Escape, scroll bloqueado)

Medidas de la sección 7 del spec (botón 14 px, input con alto mínimo 36, label 12 px al 70%, etc.). Tests de componentes para Field (error accesible), QuantityStepper (límites), Price/NetPrice/InstallmentsNote (formatos exactos), Stars (`aria-label`) y Dialog (Escape y foco).

### Task 3: Animaciones de la etapa 1 (`components/motion`)

**Dueño:** `apps/store/src/components/motion/**`.

**Produce** (Client Components con `LazyMotion` + `m`, TSDoc y props documentadas), según la tabla de la sección 17 del spec:
- `Reveal` (`kind`: up, rise, fade, scale, left, clip, bar; `delay`; `duration`), `RiseText`
- `PageEnter` (blur + 24 px, 800 ms, 180 ms de retraso; se dispara al cambiar el `pathname` o los params), `PageCurtain` (cortina con el logo al cambiar de página)
- `Tilt` (máx. 10°, solo con mouse), `Magnetic`, `CountUp` (1800 ms, decimales con coma), `ScrubText` (palabra por palabra con el scroll), `Float`
- `GridReplay` (reaparición escalonada, 45 ms por ítem), `TabFade`, `Ping`, `MouseParallax`, `DrawCheck`, `Shake` (expone `shake()` por ref), `HorizontalScroll` (sección fija con progreso)
- Hook `useScrollTopOnStep(step)`. Curvas: `tokens.easing.main` y `tokens.easing.spring`.

Regla: con `prefers-reduced-motion: reduce` el contenido se muestra en su estado final (fade corto o nada), **nunca queda invisible**. Tests: `Reveal` con reduced motion renderiza visible; `CountUp` termina en el valor exacto formateado; `Shake` expone `shake`.

### Task 4: API simulada para los formularios públicos (`packages/api-client`)

**Dueño:** `packages/api-client/src/mock/**` (handlers nuevos y su registro), `packages/api-client/src/services/**` (servicios nuevos).

- Handlers: `POST /products/{slug}/reviews` (202, queda `pending`, valida con `reviewSchema`, campo trampa → 202 sin guardar), `POST /contact` (202, `contactSchema`), `POST /withdrawals` (201 `{ code }`, código `ARR-XXXXXX` único; `withdrawalSchema`). Los quita de `PENDING_OPERATIONS` (la cobertura del contrato tiene que seguir en verde) y guarda en `db.reviews` y `db.messages`.
- Servicios: `createReview(api, slug, input)`, `sendContactMessage(api, input)`, `requestWithdrawal(api, input)`.
- Tests de handlers y servicios, incluidos los mensajes en español de los 422.

## Ola 0.5 (después de la Ola 0)

### Task 5: Layout, carrito y tarjeta de producto

**Dueño:** `apps/store/src/components/layout/**`, `apps/store/src/features/cart/**`, `apps/store/src/features/product-card/**`, `apps/store/src/features/toast/**`, `apps/store/src/app/layout.tsx`, `apps/store/src/app/providers.tsx`, `apps/store/src/lib/data/layout.ts`.

- **Layout** (spec §9.5): `TopBar` (link al botón de arrepentimiento), `Header` (logo, 6 links con activo, incluido "Tienda" en la ficha; búsqueda abre un evento que consume la feature `search`; carrito con contador que rebota; vidrio al pasar 8 px; barra de progreso de scroll), `MobileMenu` (por debajo de 1040 px), `Footer` (contenido de `FooterContent` + `seller` de ajustes, links legales y wordmark con recorte). `app/layout.tsx` monta `TopBar`, `Header`, `PageCurtain`, `PageEnter`, `Footer`, `CartDrawer`, `Toaster` y `CartHydrator`.
- **Toast** (`features/toast`): `useToast().show({ title, subtitle, action? })`. Abajo al centro, 2,8 s, se oculta al abrir el carrito.
- **Carrito** (`features/cart`, spec §9.4):
  - `cart.store.ts` (Zustand + `persist` `name: 'galpon.cart'`, `version: 1`, `skipHydration`), `CartHydrator`, `useCart()`.
  - Las líneas usan `CartLine` de domain; los montos, `productLineAmounts`, `kitLineAmounts` y `cartTotals`.
  - Conciliación con `listProducts({ ids })` al hidratar, al abrir el panel y al entrar al checkout.
  - `CartDrawer` (estados vacío y con líneas, "Ahorrás $…", "Finalizar compra" → `/checkout`), `FlyToCart` (desde el punto del clic al botón del carrito).
  - API pública: `addProductToCart`, `addKitToCart`, `openCart`.
- **Tarjeta Vitrina** (`features/product-card`): `ProductCard` con todo lo de la sección 9.5 del spec. Agregar rápido usa las opciones por defecto en mates, respeta `remainingQuantityFor` y dispara `FlyToCart` + toast.
- **Tests:**
  - Conciliación del carrito: los 4 casos de la tabla §9.4 (Review Focus 1).
  - Tope de cantidad con doble clic (Review Focus 2).
  - Toast al agregar.
  - `ProductCard` sin precio, sin stock y con placeholder.

## Ola 1 (en paralelo, cuatro agentes)

### Task 6: Inicio

**Dueño:** `apps/store/src/features/home/**`, `apps/store/src/app/(tienda)/page.tsx`.

Las secciones del spec §9.5 "Inicio", en orden y con las capturas `home-*.png`:
- hero
- historia de 7 escenas (sin el mate 3D: en su lugar, la foto del mate con `Float`, porque el 3D llega en P5)
- colección horizontal
- destacados (`ProductCard`)
- manifiesto (`ScrubText`)
- cifras (`CountUp`, calculadas del catálogo según §9.5)
- bloque kit
- reseñas destacadas

Los productos de las escenas salen de `HomeContent.storyProducts`, con respaldo si alguno no es comprable. Tests: cálculo de cifras (función pura `computeHomeStats` con el catálogo de los fixtures: 27, 6, 16, 4, 4) y respaldo de `storyProducts`.

### Task 7: Catálogo (tienda)

**Dueño:** `apps/store/src/features/catalog/**`, `apps/store/src/app/(tienda)/tienda/**`.

- `/tienda` y `/tienda/[linea]` (estático: catálogo publicado completo desde `lib/data`) con filtrado y orden en el cliente con `useSearchParams` dentro de `<Suspense>`: `q` y `orden` (`destacados` | `menor` | `mayor` | `az`) con `matchesSearch` y `sortProducts` de domain.
- Título y bajada de la línea, contador, botones de línea con cantidad, buscador, orden, `GridReplay`, estado vacío "No encontramos resultados para '…'." + "Limpiar búsqueda", línea sin productos y banda final hacia el kit.
- `generateStaticParams` de líneas (con el relleno de `notFound()` si no hay).
- Tests: filtro y orden combinados, query con `<script>` mostrada como texto (Review Focus 5) y línea inexistente → `notFound`.

### Task 8: Producto y reseñas

**Dueño:** `apps/store/src/features/product/**`, `apps/store/src/features/reviews/**`, `apps/store/src/app/(tienda)/producto/**`.

- `/producto/[slug]`: estático por producto + `dynamicParams`.
  - Slug inválido (`RangeError` de `getProduct`) o inexistente → `notFound()` (Review Focus 3).
  - Slug viejo → `permanentRedirect` al actual.
- Ficha completa según §9.5:
  - migas, galería, código, precio + `NetPrice` + `InstallmentsNote`, stock con `Ping`
  - cuero (`Swatch`) y virola (`Segmented`) solo en mates
  - cantidad, agregar al carrito (`FlyToCart`), "Comprar ahora" (agrega y va a `/checkout`)
  - "Consultar por mail" si no es comprable
  - garantías (Cambios y Arrepentimiento por separado)
  - pestañas con `TabFade` (textos de `tabs` + `descriptionNote`)
  - banda "Completá la ronda" → `/kit?mate=`
  - relacionados
- **Reseñas:** resumen con promedio (`CountUp`), distribución con barras (`Reveal` `bar`), listado (fecha `formatMonthYear` y "Compra verificada" solo si `verifiedPurchase`), formulario (estrellas con hover y palabras, `reviewSchema` con `Shake` en error, aviso de privacidad, campo trampa) que manda `createReview` y muestra "Gracias, tu reseña se publica cuando la revisemos".
- Metadatos y JSON-LD del producto.
- Tests:
  - opciones solo en mates
  - "Consultar por mail" con asunto "Consulta: {nombre}"
  - formulario de reseña con errores y éxito
  - `notFound` por slug inválido

### Task 9: Kit y búsqueda

**Dueño:** `apps/store/src/features/kit/**`, `apps/store/src/features/search/**`, `apps/store/src/app/(tienda)/kit/**`.

- **Kit** (spec §9.4 y §9.5):
  - `kit.store.ts` en memoria; pasos libres; avance solo a los 420 ms.
  - Opciones solo comprables; vista Resumen; estados de la barra ("Sin elegir", "Faltan N", "Listo para agregar").
  - Panel con cuero, subtotal, "Descuento kit −10%" y total, todo con `kitLineAmounts`.
  - "Agregar kit al carrito" (abre el carrito a los 850 ms; respeta el tope) y "Empezar de nuevo" (no reinicia el cuero).
  - `/kit?mate={slug}` elige el mate si es comprable, conserva lo elegido y abre en Bombilla.
  - `useScrollTopOnStep`.
- **Búsqueda** (spec §9.5): modal con `Dialog`, atajo "/" fuera de campos, foco al abrir.
  - Vacía muestra las líneas; hasta 6 resultados; "Sin resultados para '…'.".
  - Enter abre el producto si hay uno solo o va a `/tienda?q=` (codificada).
  - El catálogo se carga al abrir por primera vez.
- Tests: avance automático y tope del kit (Review Focus 2), `?mate=` válido e inválido, Enter con 0, 1 y N resultados (Review Focus 5), atajo "/" ignorado dentro de un input.

### Task 10: Páginas informativas

**Dueño:** `apps/store/src/features/{about,faq,contact,withdrawal,legal}/**`, `apps/store/src/app/(tienda)/{nosotros,preguntas-frecuentes,contacto,arrepentimiento,terminos,privacidad}/**`, `apps/store/src/app/not-found.tsx`, `apps/store/src/app/error.tsx`.

- **Nosotros**: hero con `MouseParallax`, socios, frase con `ScrubText` y pasos.
- **Preguntas frecuentes**: categorías, acordeón con `grid-template-rows`; el ancla `#envios` abre esa categoría.
- **Contacto**: email con "Copiar"/"Copiado", accesos y formulario con `contactSchema`. El motivo "Arrepentimiento" cambia al formulario de `withdrawal`. Muestra el canal alternativo, el área y el horario si existen en `seller`.
- **Arrepentimiento** (spec §9.6): formulario sin exigir número de pedido; muestra el código devuelto.
- **Legales**: `LegalContent` en párrafos.
- `not-found` ("No encontramos esa página") y `error` con reintentar.
- Las páginas con estado final se reinician con `key` (Cache Components y `<Activity>`).
- Tests: contacto ok, 422 y error de red; arrepentimiento sin número de pedido; el ancla abre la categoría.

## Ola 2

### Task 11: SEO, E2E de P2 y control visual

**Dueño:** `apps/store/src/app/{sitemap.ts,robots.ts,manifest.ts,icon.png,apple-icon.png,opengraph-image.*}`, `apps/store/src/lib/seo.ts`, `e2e/store/**`.

- `sitemap.ts` (inicio, tienda, líneas, productos publicados, páginas informativas), `robots.ts`, `manifest.ts`, íconos desde `galpon-mark.png`, `opengraph-image` por defecto y metadatos por página (`seo.ts`).
- E2E (escritorio y Pixel 7):
  - navegar las pantallas
  - agregar desde la tarjeta y desde la ficha
  - armar un kit y verlo en el carrito
  - búsqueda con Enter
  - reseña enviada
  - contacto
  - arrepentimiento con código
  - `prefers-reduced-motion` (todo visible, Review Focus 4)
  - sin violaciones de CSP
  - axe sin violaciones serias en inicio, tienda, producto, kit, contacto y arrepentimiento
- **Control visual**: test E2E que guarda capturas de cada pantalla a 1440 y 390 en `test-results/visual/`, y una **lista de control** en `docs/design/galpon-tienda-v3/CHECKLIST-P2.md`: por pantalla, ✅/❌ en estructura, textos, colores, tipografía, espacios, estados y animaciones, comparado con `screens/`, anotando los desvíos aceptados.

**Verificación final de P2:** `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`, `npm run test:e2e`.
