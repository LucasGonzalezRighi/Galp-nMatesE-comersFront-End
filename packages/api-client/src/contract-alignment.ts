import type * as Domain from '@galpon/domain'
import type { ContactReason as SchemaContactReason } from '@galpon/schemas'
import type { components } from './generated/schema'

/** Es `true` solo si `A` y `B` son exactamente el mismo tipo (no alcanza con que se asignen). */
type Equals<A, B> =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- idioma estándar para comparar tipos con exactitud: cada `T` solo hace que TypeScript compare las dos firmas
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

/** Falla al compilar si `T` no es `true`. */
type Assert<T extends true> = T

/** Schemas del contrato `docs/api/openapi.yaml`, ya generados. */
type S = components['schemas']

/**
 * Comprueba en compilación que los enums del contrato OpenAPI son idénticos a los de
 * `@galpon/domain` (y el motivo de contacto, a los de `@galpon/schemas`).
 *
 * Solo hay aserciones de tipos, sin código en tiempo de ejecución: si alguien cambia un valor de
 * un lado y no del otro, `npm run typecheck` falla en la línea del enum que se desfasó.
 */
export type ContractAlignment = [
  Assert<Equals<S['ProductGroup'], Domain.ProductGroup>>,
  Assert<Equals<S['ProductStatus'], Domain.ProductStatus>>,
  Assert<Equals<S['Leather'], Domain.Leather>>,
  Assert<Equals<S['Ferrule'], Domain.Ferrule>>,
  Assert<Equals<S['ProductSortOrder'], Domain.ProductSortOrder>>,
  Assert<Equals<S['ShippingMethod'], Domain.ShippingMethod>>,
  Assert<Equals<S['OrderStatus'], Domain.OrderStatus>>,
  Assert<Equals<S['PaymentStatus'], Domain.PaymentStatus>>,
  Assert<Equals<S['PaymentMethod'], Domain.PaymentMethod>>,
  Assert<Equals<S['Province'], Domain.Province>>,
  Assert<Equals<S['ContactReason'], SchemaContactReason>>,
]
