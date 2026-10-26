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
- **Errores**: `application/problem+json` (`Problem`), con `errors` para el detalle por campo y `changes` para los conflictos de pedido. Los errores comunes están en `components.responses` (`ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `RateLimited`, `ServerError`); se referencian, no se repiten.
- **Límite de uso**: `429` siempre trae la cabecera `Retry-After`.
- **Seguridad**: la sesión, el token CSRF (`X-CSRF-Token`) y el token de pedido (`X-Order-Token`) son esquemas de seguridad (`components.securitySchemes`), no parámetros. Así el middleware del cliente los agrega y las llamadas no los piden una por una. Las rutas públicas declaran `security: []`.
- **Idempotencia**: las escrituras de pedidos y pagos llevan `Idempotency-Key` (un UUID por intento), que es el parámetro `IdempotencyKey`.
- **Operaciones**: cada una tiene `operationId` en `camelCase`, `summary` en español, `tags` y `responses`.
- **Enums**: `ProductGroup`, `ProductStatus`, `Leather`, `Ferrule`, `ProductSortOrder`, `ShippingMethod`, `OrderStatus`, `PaymentStatus`, `PaymentMethod` y `Province` copian literalmente los valores de `packages/domain`; `ContactReason` los de `packages/schemas`. Si se cambia uno hay que cambiar el otro; la alineación se comprueba con tipos en `packages/api-client`.

## Qué cubre hoy

Esta versión del contrato tiene la base (raíz, seguridad, parámetros, respuestas de error y enums), las lecturas públicas, las escrituras de la tienda y de la cuenta del cliente, y el dashboard de administración:

| Tag        | Rutas                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `catalog`  | `GET /categories`, `/products`, `/products/{slug}`, `/products/{slug}/related`                                                                                                                                                                                                                                                                                                                                                                                     |
| `reviews`  | `GET` y `POST /products/{slug}/reviews`, `GET /reviews/featured`                                                                                                                                                                                                                                                                                                                                                                                                   |
| `content`  | `GET /content/home`, `/about`, `/faq`, `/footer`, `/product-tabs` y `/content/legal/{document}`                                                                                                                                                                                                                                                                                                                                                                    |
| `settings` | `GET /settings/public`                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `cart`     | `POST /cart/quote`, `POST /shipping/quote`                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `orders`   | `POST /orders`, `GET /orders/{number}`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `payments` | `POST /orders/{number}/payments/mercadopago/preference`, `/card` y `/installments`, `POST /orders/{number}/cancel-payment`, `POST /webhooks/mercadopago` (solo lo llama Mercado Pago)                                                                                                                                                                                                                                                                              |
| `contact`  | `POST /contact`, `POST /withdrawals`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `account`  | `/auth/csrf`, `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/password/forgot` y `/reset`, `/me`, `/me/orders`, `/me/orders/{number}`, `/me/addresses` y `/me/addresses/{id}`                                                                                                                                                                                                                                                                              |
| `admin`    | Todo bajo `/admin`: `/auth/login`, `/logout`, `/me`, `/csrf` y `/password`; `/dashboard/summary`; `/products`, `/products/{id}` y `/products/{id}/archive`; `/categories`, `/categories/{id}` y `/categories/order`; `/media/signature`; `/orders`, `/orders/{number}` y `/orders/{number}/status`; `/content/home`, `/about`, `/faq`, `/footer`, `/product-tabs` y `/legal/{document}`; `/settings`; `/reviews` y `/reviews/{id}`; `/messages` y `/messages/{id}` |

Las rutas de pago del pedido llevan `X-Order-Token` (el que entrega `POST /orders`, una sola vez). `/installments` recibe solo el BIN de la tarjeta y calcula las cuotas sobre el total del pedido, así que el front no llama a Mercado Pago directo para eso y el modo de prueba puede simularlas. `/cancel-payment` cierra el intento de pago activo (hay uno solo por pedido) para probar con otro medio: responde `204` aunque no hubiera ninguno y deja el pedido en `pending_payment`, con su reserva de stock. El pedido vence en `reservedUntil` (30 minutos desde que se crea).

La cotización del carrito trae también los importes sin impuestos nacionales que exige la Ley 27.743: `netUnitPriceArs` en cada línea (también en los kits) y `netSubtotalArs`. Valen `null` si el ajuste `priceDisplay.showNetPrice` está apagado.

Las rutas de `admin` llevan la cookie de sesión `adminSession` (`__Host-galpon_admin`, `SameSite=Lax`); las que escriben llevan además el token `X-CSRF-Token`. El login es la excepción: no tiene sesión todavía y devuelve el token en `csrfToken`. El `PUT` de contenido y de ajustes y el `PATCH` de productos y líneas llevan el objeto completo, como `PATCH /me/addresses/{id}`; el `PATCH` de reseñas y de mensajes modifica solo los campos que vienen.

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
