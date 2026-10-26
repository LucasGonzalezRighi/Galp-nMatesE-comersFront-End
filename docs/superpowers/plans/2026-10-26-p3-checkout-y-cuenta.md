# P3 · Checkout, Mercado Pago y cuenta de cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el circuito de compra de la tienda en modo de prueba: cotización del carrito contra la API, checkout de 3 pasos, pedido idempotente, pago con Mercado Pago (redirección simulada y tarjeta con campos seguros simulados, incluido 3-D Secure), pantalla de resultado, seguimiento de pedido de invitado y cuenta de cliente.

**Architecture:** La API simulada suma pedidos, pagos, sesión de cliente y un simulador de la página de Mercado Pago, con las mismas garantías que tendrá el back (idempotencia por `Idempotency-Key`, un intento de pago activo por pedido, reserva de stock de 30 min, estados normalizados). En la tienda, `features/checkout` orquesta 3 pasos con React Hook Form + `@galpon/schemas`, `features/payments` encapsula Mercado Pago detrás de una interfaz (`PaymentFields`) con dos implementaciones (Secure Fields reales / campos simulados) elegidas por `NEXT_PUBLIC_API_MODE`, y `features/account` maneja sesión, pedidos y direcciones. El token del pedido viaja en cabecera, nunca en la URL.

**Tech Stack:** lo de P2 + `@mercadopago/sdk-js` 0.0.3 (solo en modo vivo, carga diferida) · React Hook Form + `@hookform/resolvers` · `proxy.ts` de Next para proteger `/cuenta/*`.

**Spec:** `docs/superpowers/specs/2026-10-19-galpon-frontend-design.md` §9.1 (rutas), §9.4 (carrito), §9.7 (estados), §12 (contrato), §13 (modo de prueba), **§14 completa** (checkout y pagos), §15 (validaciones), §16 (seguridad). Contrato: `docs/api/openapi.yaml` (paths `/cart/quote`, `/shipping/quote`, `/orders*`, `/auth/*`, `/me*`).

## Global Constraints

- Las de P1 y P2 (`docs/superpowers/plans/2026-10-20-p1-fundaciones-y-contrato.md`, `2026-10-21-p2-tienda-publica.md`): npm, versiones exactas, TS estricto, TSDoc en español, textos en `*.copy.ts`, reglas de negocio desde `@galpon/domain`, features cerradas por `index.ts`, solo commits locales, staging con rutas explícitas (nunca `git add -A`), no tocar `../backend`.
- **Dinero y pagos (spec §14):** el total que paga el cliente es **siempre** el que devuelve `POST /orders`; el front nunca cobra un total que no confirmó el back. Los datos de tarjeta **nunca** pasan por nuestro código en modo vivo (Secure Fields). Ningún dato de tarjeta se guarda en `sessionStorage`/`localStorage`.
- **Token del pedido:** cabecera `X-Order-Token`, guardado en `sessionStorage` (`galpon.order`) junto con `number` y `cartHash`; jamás en la URL. La URL de regreso lleva solo `?pedido=GLP-12345`.
- **Idempotencia:** `POST /orders` y los dos endpoints de pago llevan `Idempotency-Key` (UUID v4 generado una vez por intento y reutilizado en reintentos de red).
- **Legal (spec §14.1, §14.5, §14.6):** antes del botón "Pagar", el aviso de arrepentimiento con link y la aceptación de Términos y Privacidad; el resumen muestra "Precio sin impuestos nacionales" por línea y en el subtotal si `showNetPrice`; las cuotas muestran CFT/TEA y solo dicen "sin interés" con CFT 0.
- **Trabajo en paralelo:** cada task declara sus carpetas; el controlador prepara `package.json`, `package-lock.json`, `vitest.config.ts` y `openapi.yaml` (los cambios de contrato se hacen en la Ola 0, nunca en paralelo).

## Refinamientos del spec que introduce este plan

1. **Precio neto en kits y subtotal (Ruling P2-4):** `CartQuoteLine` suma `netUnitPriceArs: TotalArs | null` y `CartQuote` suma `netSubtotalArs: TotalArs | null`; el back los calcula con la alícuota configurada. Así el carrito y el resumen cumplen §14.5 también para kits sin recalcular en el front.
2. **Resultado de pago simulado:** en modo de prueba el simulador de MP (`/checkout/mp-simulado`) y los campos simulados de tarjeta deciden el resultado por el **nombre del titular** como el sandbox real (`APRO`, `CONT`, `OTHE`, `FUND`, `SECU`, `EXPI`, `CALL`); el titular `3DS` dispara un desafío 3-D Secure simulado.
3. **Sesión de cliente en modo de prueba:** el mock emite la cookie `__Host-galpon_session` como cookie normal (no `__Host-` en http://localhost; el nombre se parametriza) y `proxy.ts` la lee para proteger `/cuenta/*`.
4. **Cuotas sin MP real:** en modo de prueba `getInstallments` se simula con la tabla de ajustes (`maxWithoutInterest` cuotas con CFT 0 y, además, 6 y 12 cuotas con CFT de ejemplo 45,90 % / TEA 38,00 %) para que la pantalla muestre los dos casos.

## Review Focus

1. **Doble clic / doble pestaña en "Pagar":** un solo pedido y un solo pago (misma `Idempotency-Key` → misma respuesta; segundo intento con otro medio cancela el anterior) → tests en Tasks 2 y 7.
2. **Vuelta de Mercado Pago con el `sessionStorage` vacío** (otra pestaña, navegador que lo borró): `/checkout/resultado?pedido=…` sin token muestra "No encontramos ese pedido" sin revelar nada y sin romper → test en Task 7.
3. **El carrito cambió mientras el pedido estaba pendiente** (precio, stock, descuento del kit): `409 total_changed` → la pantalla muestra qué cambió y **no cobra** → tests en Tasks 2 y 6.
4. **Pedido vencido (30 min) al volver a pagar:** `409` → "El pedido venció" + volver al carrito, y el stock reservado se libera → tests en Tasks 2 y 7.
5. **Recarga en el paso 2 o 3:** contacto y envío se conservan (`sessionStorage`), los datos de tarjeta no; el paso vuelve al último completo → test en Task 6.

---

## Ola 0 (secuencial: contrato primero, después el mock en paralelo con el pre-wire)

### Task 1: Contrato — ajustes para P3

**Dueño:** `docs/api/openapi.yaml`, `docs/api/README.md`, `packages/api-client/src/generated/**` (regenerar), `packages/api-client/src/contract-alignment.ts`.

- `CartQuoteLine.netUnitPriceArs` y `CartQuote.netSubtotalArs` (refinamiento 1), con `description` en español.
- `POST /orders/{number}/payments/mercadopago/installments` (nuevo, público con `orderToken`): `{ bin, paymentTypeId }` → `InstallmentOption[] { installments, installmentAmountArs, totalArs, cftPercent, teaPercent, label }`. Evita que el front llame a MP directo en modo vivo y permite simularlo.
- `POST /orders/{number}/cancel-payment` (público con `orderToken`): cancela el intento activo antes de probar otro medio (spec §14.2 "un intento activo"). 204.
- `GET /orders/{number}` acepta también el token por cookie de cliente dueño (ya está) y documenta `expiresAt`/`reservedUntil`.
- `npm run api:lint` 0/0, `npm run api:generate`, `npm run api:check`, `npm run typecheck`.

### Task 2: API simulada — pedidos, pagos y sesión de cliente

**Dueño:** `packages/api-client/src/mock/**`, `packages/api-client/src/services/**`, `packages/api-client/src/react/**` (solo hooks nuevos), `packages/api-client/README.md`.

Handlers (saca cada operación de `PENDING_OPERATIONS`; `contract-coverage` en verde):
- `POST /cart/quote`: valida ítems, resuelve precios con `domain`, `issue` por línea (`unavailable`, `sold_out`, `quantity_reduced`, `price_changed` comparando con `expectedUnitPriceArs` si viene), `netUnitPriceArs`/`netSubtotalArs` con `vatRatePercent` de ajustes.
- `POST /shipping/quote`: costo/plazo fijos de ajustes; `postalCode` opcional en `pickup`.
- `POST /orders`: `Idempotency-Key` obligatoria (422 si falta; misma clave → misma respuesta 201; misma clave con otro cuerpo → 422); recalcula todo; `409 stock_changed | price_changed | total_changed` con `changes[]`; reserva stock (`reservedUntil = ahora + 30 min`); genera `GLP-` + 5 dígitos y `orderToken` (hash guardado); `status: pending_payment`, `paymentStatus: none`.
- `GET /orders/{number}`: `X-Order-Token` o sesión dueña; 404 si no coincide. Si venció la reserva → `status: expired`, libera stock.
- `POST …/preference`: un intento activo (si hay uno, lo cancela); `initPoint = /checkout/mp-simulado?pedido=…&intent=…`; 409 si `paid`/`expired`.
- `POST …/card`: valida `CardPaymentInput`; decide por el titular (refinamiento 2): `APRO → approved`, `CONT → pending`, `3DS → action_required + challenge.url = /checkout/mp-simulado?pedido=…&challenge=1`, `OTHE/FUND/SECU/EXPI/CALL → rejected` con `statusDetail` real de MP (`cc_rejected_other_reason`, `cc_rejected_insufficient_amount`, `cc_rejected_bad_filled_security_code`, `cc_rejected_bad_filled_date`, `cc_rejected_call_for_authorize`); aprobado → `paid`, commit de stock, vacía la reserva.
- `POST …/installments`: refinamiento 4.
- `POST …/cancel-payment`: cancela el intento activo (`paymentStatus: cancelled` del intento, pedido sigue `pending_payment`).
- **Simulador de MP** (handler interno `POST /__mock/mercadopago/resolve { number, intent, result }`, fuera del contrato pero dentro del mock): aplica `approved | pending | rejected` al intento y devuelve la URL de regreso. Lo usa la página `/checkout/mp-simulado`.
- Sesión de cliente: `GET /auth/csrf`, `POST /auth/register` (409 email existente), `login` (401), `logout`, `password/forgot` (202 siempre), `password/reset` (token de prueba `RESET-OK`), `GET|PATCH /me`, `GET /me/orders`, `GET /me/orders/{number}`, `GET|POST /me/addresses`, `PATCH|DELETE /me/addresses/{id}`. Cookie de sesión (nombre configurable; `galpon_session` en mock) + CSRF ligado a la sesión. Los pedidos de invitado con el mismo email se asocian al registrarse.
- Servicios + hooks: `quoteCart`, `quoteShipping`, `createOrder`, `getOrder`, `createMercadoPagoPreference`, `payWithCard`, `getInstallments`, `cancelPayment`, y los de cuenta (`register`, `login`, `logout`, `forgotPassword`, `resetPassword`, `getMe`, `updateMe`, `listMyOrders`, `getMyOrder`, `listMyAddresses`, `createMyAddress`, `updateMyAddress`, `deleteMyAddress`). `createApiClient` suma `getOrderToken?: () => string | undefined` → cabecera `X-Order-Token`.
- Tests: idempotencia (Review Focus 1), 409 por cambios (RF 3), vencimiento (RF 4), un intento activo, cada resultado por titular, sesión y CSRF, pedidos de invitado asociados al registrarse.

### Pre-wire del controlador (después de la Task 1, en paralelo con la Task 2)

- `apps/store/package.json`: `@mercadopago/sdk-js` (versión exacta) y `react-hook-form` + `@hookform/resolvers` (versiones exactas). `npm install`, commit.

## Ola 1 (en paralelo)

### Task 3: Cotización del carrito contra la API

**Dueño:** `apps/store/src/features/cart/**` (solo `use-cart-view.ts`, `cart-view.ts`, `CartLineItem.tsx`, `CartDrawer.tsx` y tests).

- `useCartView` pasa a usar `quoteCart` (una llamada con todas las líneas) en lugar de `listProducts({ ids })` + cálculo local; `domain` sigue calculando el `cartHash` y las cantidades máximas. Los `issue` de la cotización alimentan la conciliación existente (misma tabla §9.4).
- Muestra `netUnitPriceArs` en todas las líneas (incluido kit) y `netSubtotalArs` bajo el subtotal cuando `showNetPrice` (cierra Ruling P2-4). Con cantidad > 1 el texto dice "c/u".
- `cartHash` exportado desde `features/cart` para que el checkout detecte cambios.
- Tests: kit con neto, `issue` → aviso, `cartHash` estable.

### Task 4: Mercado Pago — campos de pago desacoplados (`features/payments`)

**Dueño:** `apps/store/src/features/payments/**`.

- Interfaz `PaymentFields` (`payments.types.ts`): `mount(container, { style })`, `on('binChange' | 'validityChange', cb)`, `createCardToken({ cardholderName, identificationType, identificationNumber })`, `focus(field)`, `unmount()`. Dos implementaciones:
  - `mercadopago-fields.ts` (modo vivo): carga diferida de `@mercadopago/sdk-js`, `mp.fields.create` para número/vencimiento/CVC, `getPaymentMethods` por BIN (`field.update({ settings })`), `getIssuers`, `getIdentificationTypes`; nunca lee los dígitos.
  - `simulated-fields.tsx` (modo de prueba): inputs propios con la misma interfaz; detecta marca por BIN (Visa 4, Mastercard 5, Amex 3[47]); el token simulado codifica el titular para que el mock decida el resultado.
- Componente `CardPaymentForm`: titular, tipo y número de documento (`cardholderSchema`), selector de cuotas (viene por prop, desde `getInstallments` del back), tarjeta animada del diseño (marca, BIN + `••••`, titular, gira al enfocar el CVC; vencimiento y CVC fijos `MM/AA` y `•••`), errores por campo con `aria-live` y `Shake` ("Número incompleto", "Vencimiento inválido", "CVC inválido"), `ChallengeDialog` para 3-D Secure (iframe en `Dialog`, título "Verificá tu compra con tu banco").
- `InstallmentsSelect`: "1 pago de $X", "3 cuotas sin interés de $Y · CFT 0,00 % (TEA 0,00 %)", "6 cuotas de $Z · Total $T · CFT 45,90 % (TEA 38,00 %)" — "sin interés" solo con CFT 0; CFT en letra mayor que TEA (§14.4).
- Tests: la implementación simulada cumple la interfaz; marca por BIN; cuotas formateadas; el formulario nunca expone el número en el DOM fuera del campo; focus al primer error.

### Task 5: Cuenta de cliente (`features/account`)

**Dueño:** `apps/store/src/features/account/**`, `apps/store/src/app/(tienda)/cuenta/**`, `apps/store/src/proxy.ts`, `apps/store/src/lib/api.server.ts` (solo `getServerApiForRequest(cookies)`).

- Rutas (§9.1): `/cuenta/ingresar`, `/cuenta/registro`, `/cuenta/recuperar`, `/cuenta/restablecer`, `/cuenta` (perfil + resumen), `/cuenta/pedidos`, `/cuenta/pedidos/[numero]`, `/cuenta/direcciones`. `proxy.ts` redirige a `/cuenta/ingresar?volver=` si no hay cookie de sesión.
- Formularios con `registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `addressBookEntrySchema`; CSRF por `getCustomerCsrfToken`; `useSession()` (TanStack Query, `getMe`, 401 → sin sesión).
- Página de pedido con estados y pagos (misma `OrderSummaryCard` que usa el checkout → vive en `features/orders`? No: para no cruzar features, `features/account` tiene su propia vista y el resultado del checkout usa la suya; el componente compartido de líneas de pedido va en `components/ui/OrderLines.tsx`, dueño de esta task).
- Header: si hay sesión, el ícono de cuenta muestra el nombre (una línea en `components/layout/Header.tsx`, autorizada).
- Estados §9.7 (vacíos, 401, errores). Tests: proxy con/sin cookie, registro con email existente (409), login 401, direcciones CRUD, pedido ajeno → 404.

## Ola 2

### Task 6: Checkout de 3 pasos (`features/checkout`)

**Dueño:** `apps/store/src/features/checkout/**`, `apps/store/src/app/(tienda)/checkout/page.tsx`, `apps/store/src/app/(tienda)/checkout/layout.tsx` (noindex).

- Store (`checkout.store.ts`, `sessionStorage` `galpon.checkout`: paso, contacto, envío; nunca tarjeta). `useScrollTopOnStep`.
- Paso 1 Contacto (`checkoutContactSchema`; con sesión, precargado y editable). Paso 2 Envío (`shippingSchema`; opciones de `PublicSettings.shippingOptions` con "Gratis"; direcciones guardadas si hay sesión; retiro sin dirección). Paso 3 Pago: elección MP / Tarjeta (textos §14.1), `CardPaymentForm` (Task 4) con cuotas de `getInstallments` sobre el total **confirmado**, aviso legal + aceptación, botón "Pagar $X con Mercado Pago" / "Pagar $X" con estados "Conectando con Mercado Pago…" / "Procesando pago seguro…".
- Resumen lateral con `useCartView` (Task 3): líneas, ahorro, subtotal (+ neto), envío ("Se calcula en el paso 2"/"Gratis"), total.
- Flujo §14.2: al pagar → `createOrder` con `expectedTotalArs` e `Idempotency-Key`; `409` → muestra `changes[]`, refresca el carrito, pide confirmar (RF 3); `201` → guarda `{ number, orderToken, cartHash }`; MP → `createMercadoPagoPreference` → `window.location.assign(initPoint)`; tarjeta → `createCardToken` → `payWithCard` → `challenge` → `ChallengeDialog` → `/checkout/resultado?pedido=`.
- "Probar con otro medio": si `cartHash` coincide y no venció → `cancelPayment` y vuelve al paso 3 con el mismo pedido; si no, pedido nuevo.
- Carrito vacío → "Tu carrito está vacío." + "Ir a la tienda". Recarga conserva pasos 1–2 (RF 5).
- Tests: validación por paso con foco y `Shake`; 409 no cobra; recarga; doble clic deshabilita y reutiliza la clave (RF 1).

### Task 7: Resultado, simulador de MP y pedido de invitado

**Dueño:** `apps/store/src/features/checkout/result/**` (sub-carpeta de checkout; se acuerda con la Task 6 que `index.ts` la reexporta), `apps/store/src/app/(tienda)/checkout/resultado/**`, `apps/store/src/app/(tienda)/checkout/mp-simulado/**`, `apps/store/src/app/(tienda)/pedido/[numero]/**`.

- `/checkout/resultado?pedido=`: lee el token de `sessionStorage`; tabla de §14.2 (`approved` → "¡Gracias, {nombre}!" con `DrawCheck`, detalle, vacía el carrito; `pending` → espera con polling cada 5 s hasta 2 min, luego "Te avisamos por mail"; `action_required` → retoma el desafío; `rejected` → motivo en español por `statusDetail` + "Probar con otro medio"; `none` → "No completaste el pago" + "Pagar"; `cancelled`/`expired` → "El pedido venció" + volver al carrito; sin token → "No encontramos ese pedido" (RF 2)). `noindex`.
- `/checkout/mp-simulado` (solo modo de prueba; 404 en vivo): página con la estética de MP simulada, muestra número y total, botones **Aprobar / Dejar pendiente / Rechazar**, y modo desafío (`challenge=1`) con "Confirmar" / "Cancelar". Llama al handler `__mock/mercadopago/resolve` y redirige a `/checkout/resultado?pedido=`.
- `/pedido/[numero]`: seguimiento del invitado con el token de `sessionStorage` (misma vista de pedido que el resultado), `noindex`.
- Textos de `statusDetail` → español en `result.copy.ts` (`cc_rejected_insufficient_amount` → "La tarjeta no tiene fondos suficientes", etc.).
- Tests: cada rama de la tabla; polling que se detiene; sin token; vencido (RF 4).

## Ola 3

### Task 8: E2E de compra, accesibilidad y cierre de P3

**Dueño:** `e2e/store/checkout*.spec.ts`, `e2e/store/account*.spec.ts`, `e2e/support/**`, `docs/design/galpon-tienda-v3/CHECKLIST-P3.md`, `apps/store/README.md`, `docs/BITACORA.md`.

- E2E (escritorio y Pixel 7): compra invitado con MP (aprobar, pendiente, rechazar); compra con tarjeta `APRO`, `OTHE`, `3DS`; 409 por cambio de precio (el test cambia el precio por el mock antes de pagar); doble envío de "Pagar"; vencimiento (el mock permite forzar `reservedUntil`); compra con cuenta (registro → direcciones → compra → pedido en `/cuenta/pedidos`); recarga en el paso 2; `/checkout/resultado` sin token; sin violaciones de CSP; axe en checkout (3 pasos), resultado, mp-simulado, cuenta.
- Capturas de checkout (3 pasos, 1440 y 390) y resultado contra `screens/checkout-*.png` (si la Task 1 de P2 no las generó, generarlas con `design:capture` agregando las rutas `#/checkout` con carrito cargado) → `CHECKLIST-P3.md`.
- README de la tienda: sección "Comprar en modo de prueba" (titulares `APRO`/`3DS`/…, simulador de MP, cuenta de prueba). Bitácora: P3.

**Verificación final de P3:** `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run api:check`, `npm run build`, `npm run test:e2e`.
