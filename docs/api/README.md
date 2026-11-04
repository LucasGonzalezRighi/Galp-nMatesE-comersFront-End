# Contrato de la API

`openapi.yaml` es el contrato entre el front (tienda y dashboard) y el back (NestJS) de Galpón Mates. Es OpenAPI 3.1 y es la fuente de verdad de rutas, formas de los datos y errores:

- El front genera sus tipos a partir de este archivo (`packages/api-client`).
- El back lo implementa tal cual, con una prueba que compara el OpenAPI que genera con este.

Las rutas son relativas al prefijo `/api/v1` que figura en `servers`.

## Convenciones

Salen de la sección 12 del [diseño del front](../superpowers/specs/2026-10-19-galpon-frontend-design.md).

- **Nombres**: JSON en `camelCase`. Los schemas llevan nombre en inglés (`ProductSummary`, `Order`) y su `description` va en español.
- **Montos**: enteros de pesos, con sufijo `Ars` (`priceArs`, `totalArs`). Los precios y costos unitarios son `Pesos` (hasta 99.999.999) y `NullablePesos`, que vale `null` cuando no corresponde (un producto "a consultar"). Los montos que resultan de sumar o multiplicar (el total de una línea, el precio de lista de una línea de kit, que suma tres piezas, el subtotal, el total del pedido, `expectedTotalArs`) son `TotalArs`, que admite hasta 2.147.483.647 (un entero de 32 bits) para que una suma de precios válidos nunca se salga del contrato.
- **Nulos**: se escriben con `type: [X, 'null']`, o con `oneOf` cuando es una referencia. Un campo que puede faltar y uno que vale `null` son cosas distintas: todo campo que no está en `required` puede no venir; el resto siempre viene, aunque sea `null`.
- **Fechas**: ISO 8601 en UTC (`date-time`). Solo `LegalContent.updatedAt` es una fecha sin hora (`date`). El front las muestra en `America/Argentina/Buenos_Aires`.
- **Listas paginadas**: `?page=&pageSize=` (de 1 a 100) y respuesta `{ items, page, pageSize, total }`.
- **Errores**: `application/problem+json` (`Problem`), con `errors` para el detalle por campo y `changes` para los conflictos de pedido. Los errores comunes están en `components.responses` (`ValidationError`, `IdempotentValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `RateLimited`, `ServerError`); se referencian, no se repiten.
- **Límite de uso**: `429` siempre trae la cabecera `Retry-After`.
- **Seguridad**: la sesión, el token CSRF (`X-CSRF-Token`) y el token de pedido (`X-Order-Token`) son esquemas de seguridad (`components.securitySchemes`), no parámetros. Así el middleware del cliente los agrega y las llamadas no los piden una por una. Las rutas públicas declaran `security: []`.
- **Idempotencia**: las escrituras de pedidos y pagos llevan `Idempotency-Key` (un UUID por intento), que es el parámetro `IdempotencyKey`. La misma clave con otro cuerpo responde `422` con `type` `idempotency_key_reused`.
- **Operaciones**: cada una tiene `operationId` en `camelCase`, `summary` en español, `tags` y `responses`.
- **Enums**: `ProductGroup`, `ProductStatus`, `ComboStatus`, `LineType`, `Leather`, `Ferrule`, `ProductSortOrder`, `ShippingMethod`, `OrderStatus`, `PaymentStatus`, `PaymentMethod` y `Province` copian literalmente los valores de `packages/domain`; `ContactReason` los de `packages/schemas`. Si se cambia uno hay que cambiar el otro; la alineación se comprueba con tipos en `packages/api-client`.

## Qué cubre hoy

Esta versión del contrato tiene la base (raíz, seguridad, parámetros, respuestas de error y enums), las lecturas públicas, las escrituras de la tienda y de la cuenta del cliente, y el dashboard de administración:

| Tag        | Rutas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`  | `GET /categories`, `/combos`, `/products`, `/products/{slug}`, `/products/{slug}/related`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `reviews`  | `GET` y `POST /products/{slug}/reviews`, `GET /reviews/featured`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `content`  | `GET /content/home`, `/about`, `/faq`, `/footer`, `/product-tabs` y `/content/legal/{document}`                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `settings` | `GET /settings/public`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `cart`     | `POST /cart/quote`, `POST /shipping/quote`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `orders`   | `POST /orders`, `GET /orders/{number}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `payments` | `POST /orders/{number}/payments/mercadopago/preference`, `/card` y `/installments`, `POST /orders/{number}/cancel-payment`, `POST /webhooks/mercadopago` (solo lo llama Mercado Pago)                                                                                                                                                                                                                                                                                                                           |
| `contact`  | `POST /contact`, `POST /withdrawals`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `account`  | `/auth/csrf`, `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/password/forgot` y `/reset`, `/me`, `/me/orders`, `/me/orders/{number}`, `/me/addresses` y `/me/addresses/{id}`                                                                                                                                                                                                                                                                                                                           |
| `admin`    | Todo bajo `/admin`: `/auth/login`, `/logout`, `/me`, `/csrf` y `/password`; `/dashboard/summary`; `/products`, `/products/{id}` y `/products/{id}/archive`; `/categories`, `/categories/{id}` y `/categories/order`; `/combos`, `/combos/{id}` y `/combos/order`; `/media/signature`; `/orders`, `/orders/{number}` y `/orders/{number}/status`; `/content/home`, `/about`, `/faq`, `/footer`, `/product-tabs` y `/legal/{document}`; `/settings`; `/reviews` y `/reviews/{id}`; `/messages` y `/messages/{id}` |

Las rutas de pago del pedido llevan `X-Order-Token` (el que entrega `POST /orders`, una sola vez). `/installments` recibe solo el BIN de la tarjeta y calcula las cuotas sobre el total del pedido, así que el front no llama a Mercado Pago directo para eso y el modo de prueba puede simularlas. `/cancel-payment` cierra el intento de pago activo (hay uno solo por pedido) para probar con otro medio: responde `204` aunque no hubiera ninguno y deja el pedido en `pending_payment`, con su reserva de stock. El pedido vence en `reservedUntil` (30 minutos desde que se crea).

La cotización del carrito trae también los importes sin impuestos nacionales que exige la Ley 27.743: `netUnitPriceArs` en cada línea (también en los kits) y `netSubtotalArs`. Ambos son el neto del precio de venta, o sea de lo que paga el cliente: `netUnitPriceArs` se calcula sobre el precio efectivo por unidad (`totalArs / cantidad`, con el ahorro por kit ya descontado) y `netSubtotalArs` sobre `subtotalArs`. Valen `null` si el ajuste `priceDisplay.showNetPrice` está apagado.

Las rutas de `admin` llevan la cookie de sesión `adminSession` (`__Host-galpon_admin`, `SameSite=Lax`); las que escriben llevan además el token `X-CSRF-Token`. El login es la excepción: no tiene sesión todavía y devuelve el token en `csrfToken`. El `PUT` de contenido y de ajustes y el `PATCH` de productos, líneas y combos llevan el objeto completo, como `PATCH /me/addresses/{id}`; el `PATCH` de reseñas y de mensajes modifica solo los campos que vienen.

## Cambios de P4 que el back tiene que implementar

El dashboard (P4) cambió el contrato en estos puntos. Cada uno tiene su `description` en `openapi.yaml` y, si es una regla de formulario, sus casos en `validation-cases.json`:

- **Ediciones concurrentes de productos**: `AdminProductInput.expectedUpdatedAt` (opcional, `date-time`). `PATCH /admin/products/{id}` lo compara con el `updatedAt` guardado y, si no coincide, responde `409` con `type` `product_changed` ("El producto cambió desde que lo abriste.") sin guardar nada; si falta, guarda igual. `POST /admin/products` lo ignora. El `409` del `PATCH` tiene dos ejemplos: `slug_taken` y `product_changed`.
- **Fotos de los socios**: `PUT /admin/content/about` recibe `AboutContentInput` (como `AboutContent`, pero `partners[].photo` es `ImageInput | null`) y el back arma la `url` desde `publicId`, como en productos y líneas. La respuesta sigue siendo `AboutContent`.
- **Fotos que el back no conoce**: un `publicId` que no salió de una subida responde `422` en ese campo (`images.N.publicId` en un producto, `image.publicId` en una línea, `partners.N.photo.publicId` en Nosotros).
- **Límites de los contenidos**: `HomeContent`, `AboutContent`, `AboutContentInput`, `FaqContent`, `FooterContent`, `ProductTabsGroupContent`, `ProductTabsContent` y `LegalContent` tienen `maxLength`, `minItems` y `maxItems` (y las cifras del inicio, de 0 a 999), los mismos que los `*ContentFormSchema` de `@galpon/schemas`. Los textos se recortan y los obligatorios no pueden quedar vacíos ("Requerido").
- **Filtro de pedidos con varios estados**: `GET /admin/orders` acepta `status` repetido (`?status=paid&status=preparing`, "Para despachar" en el dashboard) y devuelve los pedidos que están en alguno de ellos.
- **Cambios de estado del pedido**: `POST /admin/orders/{number}/status` aplica la tabla de su `description` (la misma que `adminOrderTargets` de `@galpon/domain`). Cancelar un pedido en `pending_payment` con un pago `pending` o `action_required` responde `409` `payment_in_progress`; cualquier otro cambio no permitido, `409` `invalid_status_transition`. Cancelar libera la reserva de stock y cancela el intento de pago activo; despachar guarda `tracking`.
- **CSRF rotado**: el `403` (`Forbidden`) documenta `type` `csrf_invalid` ("El token CSRF falta o no es válido."), por ejemplo cuando otro inicio de sesión rotó el token.
- **Subida de fotos**: `MediaSignature` firma `folder` y `timestamp`; la subida a Cloudinary manda exactamente `file`, `api_key`, `timestamp`, `signature` y `folder`. Carpetas por `purpose`: `product` → `galpon/productos`, `category` → `galpon/lineas`, `partner` → `galpon/socios`, `site` → `galpon/sitio`.
- **Ajustes**: `PUT /admin/settings` ignora `shippingOptions[].label`, que es fijo por método.
- **3-D Secure desde cualquier pestaña**: `OrderPayment.challenge` (`PaymentChallenge | null`, obligatorio) es la verificación pendiente del intento de pago activo, la misma que devolvió `POST …/card` en `CardPaymentResult.challenge`; vale `null` si el pago no está en `action_required`.
- **Precedencia de los avisos del carrito** (deuda de P3): en `expectedUnitPriceArs`, `quantity_reduced` y `stock_changed` ganan a `price_changed`.
- **Clave de idempotencia repetida** (deuda de P3): el `422` de `POST /orders`, `…/preference` y `…/card` es `IdempotentValidationError`, que además de `validation_error` documenta `type` `idempotency_key_reused` (la misma `Idempotency-Key` con otros datos).
- **Validaciones nuevas del dashboard**: `categoryOrderSchema`, `mediaSignatureSchema`, `orderStatusChangeSchema`, `adminReviewUpdateSchema`, `messageUpdateSchema` y los seis `*ContentFormSchema`, con sus casos en `validation-cases.json`.

## Combos: cambios que el back tiene que implementar

Los combos llegaron al front en la rama `feat/inicio-combos`; el back los implementa después de B5 y este contrato es la fuente. Un combo es un recurso nuevo (`Combo`) y un cuarto tipo de línea del carrito y del pedido (`LineType` `combo`). Las reglas están en las `description` de `openapi.yaml`; en resumen:

- **Qué es**: 2 o 3 productos fijos, distintos y de grupos distintos (a lo sumo un mate, una bombilla y una yerba), con un precio final que escribe el dashboard (`priceArs`, de 1 a 99.999.999). Sin foto propia ni slug: la tienda compone las fotos de las piezas. Estados `ComboStatus`: `draft` y `published`. El cliente solo elige cuero y virola si el combo lleva mate (todos los de `Leather` y `Ferrule`).
- **Rutas**: `GET /combos` (público: los publicados con todas sus piezas publicadas y con precio, por `position`; los que tienen una pieza sin stock vienen con `isSoldOut`), `GET` y `POST /admin/combos`, `PUT /admin/combos/order` (todos los combos, una vez cada uno) y `PATCH` (combo completo) y `DELETE /admin/combos/{id}` (renumera). `Combo` es el mismo para la tienda y el dashboard; sus derivados (`listPriceArs`, `savingsArs = max(0, listPriceArs − priceArs)`, `isPurchasable`, `isSoldOut`, `maxQuantity`, `netPriceArs`) salen de los precios y del stock vigentes de las piezas.
- **Validaciones con la base** (`422` por campo, también en borradores): `productIds.N` "Elegí un producto publicado y con precio"; con todos los productos válidos, `productIds` "Elegí productos de grupos distintos" y `priceArs` "El precio del combo tiene que ser menor que la suma de los productos ($68.998)" (la suma vigente, con el formato de la tienda). Los mensajes están en `MESSAGES` de `@galpon/schemas` (`comboProductUnavailable`, `comboDistinctGroups`, `comboPriceNotBelowSum`) y la forma del cuerpo en `comboFormSchema` y `comboOrderSchema`, con sus casos en `validation-cases.json`.
- **Carrito y pedido** (`ComboCartItemInput`): la línea manda `comboId`, `quantity`, `options` (cuero y virola, o `null` sin mate) y opcionalmente `expectedUnitPriceArs` (= `Combo.priceArs`). Clave `combo:{comboId}:{cuero|-}:{virola|-}`. Combo inexistente o en borrador, o con una pieza que no se vende: `unavailable`. Mate sin `options`: `422` en `items.N.options`. El stock de cada pieza se comparte con las demás líneas. Importes con `q` combos: `unitPriceArs = max(suma de las piezas, priceArs)`, `kitSavingsArs = (unitPriceArs − priceArs) × q`, `totalArs = priceArs × q` (el ahorro va en `kitSavingsArs`, sin campos nuevos, y siguen valiendo `subtotalArs = itemsGrossArs − kitSavingsArs` y el CHECK de totales). `price_changed` se compara con `Combo.priceArs`. `name` es el nombre del combo, `detail` las piezas con " + " y, si hay mate, " · Cuero negro · Alpaca cincelada". En el pedido: `productSlug` `null`, `options` (o `null`) y las piezas en `kitItems`, que ahora admite de 2 a 3. La reserva suma cada pieza. Ejemplo: "Dúo Imperial" ($61.999; piezas $39.999 + $28.999) × 2 cotiza `unitPriceArs` 68.998, `kitSavingsArs` 13.998 y `totalArs` 123.998.
- **Caché**: cada escritura de combos avisa la etiqueta `combos` a la tienda (`POST /api/revalidate`); un cambio de precio o de stock de un producto cambia los combos que lo usan, así que la tienda lee los combos con las etiquetas `combos` y `products`.
- **Contrato del back**: `LineType`, `CartItemInput`, `CartQuoteLine`, `OrderLine` (`kitItems.minItems` 2) y `ChangeNotice` cambiaron de forma o de descripción, así que la prueba de contrato del back marca `POST /cart/quote`, `POST /shipping/quote`, `POST /orders` y las lecturas de pedidos hasta que sume los combos.

### Combos: lo que tiene que implementar el back

Lista para el back (`backend/`, rama `main`), sacada de su código en la investigación de la ronda (2026-11-03). Va después de B5, porque toca la cotización y los pedidos:

- **Prisma** (`prisma/schema.prisma`): `enum LineType` suma `combo` (migración `ALTER TYPE line_type ADD VALUE 'combo'`). Tablas nuevas `combos` (`id` uuid v7, `name`, `description`, `price_ars`, `status combo_status`, `position`, `created_at`, `updated_at`; sin foto ni slug en esta versión) y `combo_items` (`combo_id` en cascada, `product_id` restringido, `role product_group`, `position`; clave `(combo_id, role)`, así no se repite el grupo), con el enum `combo_status`. `OrderItem` y `OrderItemComponent` sirven tal cual para la línea y sus piezas (opcional: `OrderItem.comboId` con `onDelete: SetNull`). El ahorro va en `kit_savings_ars`, así que `orders_totals_check` no cambia. `StockReservation` suma también las piezas de los combos.
- **Pedidos** (`src/modules/orders/`): `CartItem` suma `ComboCartItem` en `domain/cart-line.ts` (clave `combo:{comboId}:{cuero|-}:{virola|-}`, `cartProductIds` con las piezas); `priceCart` en `domain/pricing.ts` (importes, avisos y `kitItems` de 2 o 3); `ComboCartItemInputDto` y el mensaje de `CART_MESSAGES.lineType` en `interface/dto/cart-item-input.dto.ts`; `CartQuoteLineDto` y `OrderLineDto`; `order.mapper.ts` y `prisma-order.repository.ts`; un puerto para leer combos junto a `ProductCatalogPort`, usado por `quote-cart.query.ts` y `create-order.command.ts`.
- **Catálogo** (`src/modules/catalog/`): repositorio, consulta y controlador de `GET /combos` (con caché como `cached-product.repository.ts`, claves `catalog:*`), y el CRUD de `/admin/combos` cuando llegue el módulo admin del catálogo, con los `code` del contrato (`product_unavailable`, `duplicate_group`, `price_not_below_sum`).
- **Semilla** (`prisma/seed-data/combos.ts`): los combos de la Ruling IC-14 (Dúo Imperial, Camionero y Canarias, Torpedo completo y Bombilla y yerba publicados; Galleta y Canarias en borrador), los mismos que `FIXTURE_COMBOS` del mock.
- **Revalidación de la tienda** (`storefront-sync`, cola `storefront-revalidate` del spec del back): después de cada escritura de combos, `POST /api/revalidate` con `combos`; al cambiar el precio o el stock de un producto, también `products` (cambian `listPriceArs`, `savingsArs` e `isSoldOut` de los combos que lo usan). La tienda ya acepta la etiqueta.
- **Contrato y casos**: `npm run contract:check` del back lee `../frontend/docs/api/openapi.yaml`; con esta rama marca `POST /cart/quote`, `POST /shipping/quote`, `POST /orders` y las lecturas de pedidos hasta actualizar los DTO, y deja `/combos` y `/admin/combos…` como pendientes. Los casos nuevos de `validation-cases.json` (`Admin · combo: …` y `Admin · orden de combos`) se corren contra sus DTO.

## Cómo se valida

```bash
npm run api:lint
```

Corre `redocly lint` con la configuración de [`redocly.yaml`](../../redocly.yaml) (`extends: recommended`, sin ninguna regla apagada). Si una regla molesta se arregla el YAML, no la regla. Tiene que terminar con 0 errores.

## Cómo se generan los tipos

```bash
npm run api:generate   # escribe packages/api-client/src/generated/schema.d.ts
npm run api:check      # falla si el archivo generado no coincide con el contrato
```

El archivo generado se commitea y no se edita a mano. Cada schema de `components.schemas` pasa a ser un tipo con el mismo nombre (`Category`, `ProductDetail`...), además de `paths`, `components` y `operations`. `openapi-typescript` no es una dependencia: los scripts lo ejecutan con `npx --yes openapi-typescript@7.13.0`, así que la primera vez necesitan conexión.

## Casos de validación compartidos

[`validation-cases.json`](validation-cases.json) reúne los casos de las reglas de la sección 15 del diseño (email, nombre, teléfono, dirección, reseña, contacto, contraseña, formularios del dashboard...). Cada campo tiene al menos tres: uno válido, uno inválido con su mensaje exacto en español y uno de borde (el mínimo o el máximo permitido).

```json
{
  "field": "Contacto: mensaje",
  "name": "Contacto: mensaje: de 9 caracteres",
  "schema": "contactSchema",
  "input": {
    "name": "Lucía Gómez",
    "email": "lucia@example.com",
    "reason": "Pedido",
    "message": "aaaaaaaaa"
  },
  "valid": false,
  "errors": { "message": "Escribí al menos 10 caracteres" }
}
```

- `field` es el campo o la regla que se prueba (los casos de un mismo `field` van juntos) y `name`, único, es el título del caso.
- `schema` es el nombre del schema exportado por `@galpon/schemas` (`contactSchema`, `shippingSchema`, `productFormSchema`...).
- `input` es lo que llega, sin normalizar. Con `"valid": true`, `output` es el resultado ya normalizado (email en minúsculas, teléfono de 10 dígitos, `S/N` en mayúsculas...); si falta, solo se exige que pase.
- Con `"valid": false`, `errors` trae el mensaje de cada campo con error, con el camino unido por puntos (`address.street`, `shippingOptions.0.costArs`). Tienen que fallar esos campos, ni uno más ni uno menos. Un `null` en lugar del mensaje significa que el campo tiene que fallar pero el texto no está fijado (el campo trampa `website`, que se descarta en silencio).
- Los datos de tarjeta (Secure Fields de Mercado Pago) y la cantidad por producto no están: los valida Mercado Pago y el dominio, no un schema.

El archivo es la fuente: el test `packages/schemas/src/validation-cases.test.ts` lo corre contra los schemas reales y el back lo va a correr igual contra sus DTOs de NestJS. Para cambiar una regla se cambia el caso acá, el schema del front y el DTO del back en el mismo cambio funcional. Es un solo archivo (no se parte por schema) para que el back lo copie o lo lea tal cual.

## Cómo se cambia

El contrato se cambia **en el repo del front y en el del back en el mismo cambio funcional**: una ruta, un campo o un enum que existe de un lado y no del otro rompe la integración. Al modificarlo:

1. Editá `openapi.yaml` y corré `npm run api:lint`.
2. Regenerá los tipos con `npm run api:generate` y arreglá lo que deje de compilar (`npm run typecheck`).
3. Aplicá el mismo cambio en el back, para que su prueba de contrato siga pasando.
