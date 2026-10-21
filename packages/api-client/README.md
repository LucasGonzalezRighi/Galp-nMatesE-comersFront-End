# @galpon/api-client

Cliente de la API de Galpón Mates (sección 13 del spec). Por ahora tiene los tipos del contrato y la comprobación de que sus enums coinciden con los del dominio; el cliente, los servicios, los hooks de TanStack Query y el modo de prueba llegan en las tareas siguientes del plan.

## Tipos del contrato

`src/generated/schema.d.ts` se genera desde [`docs/api/openapi.yaml`](../../docs/api/openapi.yaml) y no se edita a mano. Exporta `paths`, `components`, `operations` y un tipo por schema (`Category`, `ProductSummary`, `Order`, `AdminProduct`…).

```bash
npm run api:generate   # regenera schema.d.ts
npm run api:check      # falla si schema.d.ts no coincide con el contrato
```

Los dos corren `npx --yes openapi-typescript@7.13.0`. El paquete no es una dependencia: su peer pide TypeScript 5 y npm no admite ese conflicto con TypeScript 6. La primera vez necesita conexión para descargarlo.

Cuando cambia el contrato: editá el YAML, corré `npm run api:lint`, `npm run api:generate` y commiteá el `schema.d.ts` junto con el YAML.

## Alineación con `domain`

`src/contract-alignment.ts` solo tiene aserciones de tipos, sin código en tiempo de ejecución. Compara cada enum del contrato (`ProductGroup`, `ProductStatus`, `Leather`, `Ferrule`, `ProductSortOrder`, `ShippingMethod`, `OrderStatus`, `PaymentStatus`, `PaymentMethod`, `Province`) con el de `@galpon/domain`, y `ContactReason` con el de `@galpon/schemas`. Si un valor cambia de un lado y no del otro, `npm run typecheck` falla en la línea del enum desfasado.

## Exports

`package.json` declara tres puntos de entrada: `.` (`src/index.ts`), `./react` (hooks de TanStack Query) y `./mock` (modo de prueba). Sus archivos se crean en las tareas siguientes.
