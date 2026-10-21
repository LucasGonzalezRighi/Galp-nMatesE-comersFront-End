# 0002. El contrato OpenAPI es la fuente de verdad

- **Estado**: Aceptada
- **Fecha**: 2026-10-20

## Contexto

El front se construye antes que el back (fase 2, NestJS en otro repositorio). Hace falta un acuerdo exacto sobre rutas, formas de los datos y errores que sirva a los dos lados: que el front pueda funcionar hoy contra una API simulada y que mañana el back lo implemente sin sorpresas.

## Decisión

`docs/api/openapi.yaml` (OpenAPI 3.1, prefijo `/api/v1`) es la **fuente de verdad** del contrato.

- `packages/api-client` genera sus tipos con `npm run api:generate` (`openapi-typescript` 7.13.0, ejecutado con `npx`; ver ADR 0007) en `src/generated/schema.d.ts`. Ese archivo se commitea y no se edita a mano.
- `npm run api:check` falla si lo commiteado difiere de lo que genera el YAML. Corre en CI.
- `npm run api:lint` (Redocly) valida el YAML: cada operación con `operationId`, `summary` en español, `tags` y respuestas de error comunes por referencia.
- **`contract-alignment`** (`packages/api-client/src/contract-alignment.ts`) compara con tipos cada enum del contrato (`ProductGroup`, `ShippingMethod`, `PaymentStatus`…) con el de `@galpon/domain`, y `ContactReason` con el de `@galpon/schemas`. Si un valor cambia de un lado y no del otro, `npm run typecheck` falla en esa línea.
- Los handlers del modo de prueba validan con los mismos schemas que usará el back, y los casos de validación compartidos ([`docs/api/validation-cases.json`](../api/validation-cases.json)) permiten que los tests de los dos repos comprueben las mismas reglas.
- En la fase 2, el back implementa este archivo tal cual y un test compara el OpenAPI que genera Swagger con esta copia. Un cambio de contrato se hace en los dos repos en el mismo cambio funcional.

Convenciones de forma: JSON en `camelCase`; montos en pesos enteros con sufijo `Ars` (ADR 0006); `problem+json` para los errores (RFC 9457); `Idempotency-Key` en las escrituras de pedidos y pagos; contenido por rutas separadas (`/content/home`, `/content/legal/{document}`…) para que cada respuesta tenga su tipo exacto.

## Consecuencias

- Cambiar el contrato obliga a regenerar los tipos, y TypeScript marca cada lugar del front que se rompe.
- El modo de prueba nunca se aparta del contrato: si el mock responde algo que el YAML no permite, el tipo no compila.
- Cada cambio tiene tres pasos (YAML, `api:generate`, commit de `schema.d.ts`) y un contrato mal escrito se paga en los dos repos.
- El front depende de que el back respete el contrato; el test del back es el que lo garantiza.

## Alternativas consideradas

- **Tipos escritos a mano en el front**: sin herramientas, pero se desalinean del back sin que nadie se entere.
- **Contrato generado por el back (code-first)**: el front tendría que esperar al back para tipar; justo lo contrario de lo que se busca.
- **tRPC o GraphQL**: atan front y back a una tecnología; el back necesita endpoints REST de todos modos (webhooks de Mercado Pago, Swagger) y los repos son independientes.
