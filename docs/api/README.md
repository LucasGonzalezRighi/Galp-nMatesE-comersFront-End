# Contrato de la API

`openapi.yaml` es el contrato entre el front (tienda y dashboard) y el back (NestJS) de Galpón Mates. Es OpenAPI 3.1 y es la fuente de verdad de rutas, formas de los datos y errores:

- El front genera sus tipos a partir de este archivo (`packages/api-client`).
- El back lo implementa tal cual, con una prueba que compara el OpenAPI que genera con este.

Las rutas son relativas al prefijo `/api/v1` que figura en `servers`.

## Convenciones

Salen de la sección 12 del [diseño del front](../superpowers/specs/2026-10-19-galpon-frontend-design.md).

- **Nombres**: JSON en `camelCase`. Los schemas llevan nombre en inglés (`ProductSummary`, `Order`) y su `description` va en español.
- **Montos**: enteros de pesos, con sufijo `Ars` (`priceArs`, `totalArs`). Los tipos son `Pesos` y `NullablePesos`; este último vale `null` cuando no corresponde (un producto "a consultar").
- **Nulos**: se escriben con `type: [X, 'null']`, o con `oneOf` cuando es una referencia. Un campo que puede faltar y uno que vale `null` son cosas distintas: todo campo que no está en `required` puede no venir; el resto siempre viene, aunque sea `null`.
- **Fechas**: ISO 8601 en UTC (`date-time`). Solo `LegalContent.updatedAt` es una fecha sin hora (`date`). El front las muestra en `America/Argentina/Buenos_Aires`.
- **Listas paginadas**: `?page=&pageSize=` (de 1 a 100) y respuesta `{ items, page, pageSize, total }`.
- **Errores**: `application/problem+json` (`Problem`), con `errors` para el detalle por campo y `changes` para los conflictos de pedido. Los errores comunes están en `components.responses` (`ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `RateLimited`, `ServerError`); se referencian, no se repiten.
- **Límite de uso**: `429` siempre trae la cabecera `Retry-After`.
- **Seguridad**: la sesión, el token CSRF (`X-CSRF-Token`) y el token de pedido (`X-Order-Token`) son esquemas de seguridad (`components.securitySchemes`), no parámetros. Así el middleware del cliente los agrega y las llamadas no los piden una por una. Las rutas públicas declaran `security: []`.
- **Idempotencia**: las escrituras de pedidos y pagos llevan `Idempotency-Key` (un UUID por intento), que es el parámetro `IdempotencyKey`.
- **Operaciones**: cada una tiene `operationId` en `camelCase`, `summary` en español, `tags` y `responses`.
- **Enums**: `ProductGroup`, `Leather`, `Ferrule`, `ProductSortOrder`, `ShippingMethod`, `OrderStatus`, `PaymentStatus`, `PaymentMethod` y `Province` copian literalmente los valores de `packages/domain`; `ContactReason` los de `packages/schemas`. Si se cambia uno hay que cambiar el otro; la alineación se comprueba con tipos en `packages/api-client`.

## Qué cubre hoy

Esta versión del contrato tiene la base (raíz, seguridad, parámetros, respuestas de error y enums), las lecturas públicas y las escrituras de la tienda y de la cuenta del cliente:

| Tag        | Rutas                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`  | `GET /categories`, `/products`, `/products/{slug}`, `/products/{slug}/related`                                                                                                        |
| `reviews`  | `GET` y `POST /products/{slug}/reviews`, `GET /reviews/featured`                                                                                                                      |
| `content`  | `GET /content/home`, `/about`, `/faq`, `/footer`, `/product-tabs` y `/content/legal/{document}`                                                                                       |
| `settings` | `GET /settings/public`                                                                                                                                                                |
| `cart`     | `POST /cart/quote`, `POST /shipping/quote`                                                                                                                                            |
| `orders`   | `POST /orders`, `GET /orders/{number}`                                                                                                                                                |
| `payments` | `POST /orders/{number}/payments/mercadopago/preference` y `/card`, `POST /webhooks/mercadopago` (solo lo llama Mercado Pago)                                                          |
| `contact`  | `POST /contact`, `POST /withdrawals`                                                                                                                                                  |
| `account`  | `/auth/csrf`, `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/password/forgot` y `/reset`, `/me`, `/me/orders`, `/me/orders/{number}`, `/me/addresses` y `/me/addresses/{id}` |

El tag `admin` ya está declarado y su cookie de sesión (`adminSession`) está definida; sus rutas se agregan en la próxima tarea.

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

Estos comandos funcionan cuando existe el paquete `api-client`. El archivo generado no se edita a mano. Cada schema de `components.schemas` pasa a ser un tipo con el mismo nombre (`Category`, `ProductDetail`...).

## Cómo se cambia

El contrato se cambia **en el repo del front y en el del back en el mismo cambio funcional**: una ruta, un campo o un enum que existe de un lado y no del otro rompe la integración. Al modificarlo:

1. Editá `openapi.yaml` y corré `npm run api:lint`.
2. Regenerá los tipos con `npm run api:generate` y arreglá lo que deje de compilar (`npm run typecheck`).
3. Aplicá el mismo cambio en el back, para que su prueba de contrato siga pasando.
