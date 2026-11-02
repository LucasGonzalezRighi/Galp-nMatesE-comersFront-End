import type {
  CartItemInput,
  CreateOrderInput,
  CustomerInput,
  ShippingOption,
} from '@galpon/api-client'
import type { PaymentMethod, ShippingMethod } from '@galpon/domain'
import { pesos } from '@galpon/domain'
import { checkoutContactSchema, shippingSchema } from '@galpon/schemas'
import type { ContactValues, ShippingValues } from './checkout.store'

/** Envío como lo pide `POST /orders`. */
type OrderShippingInput = CreateOrderInput['shipping']

/** Lo que hace falta para armar el cuerpo de `POST /orders`. */
export interface OrderInputParts {
  /** Paso 1 completo. */
  contact: ContactValues
  /** Paso 2 completo. */
  shipping: ShippingValues
  /** Líneas del carrito con su precio esperado (`useCartQuoteInput().items`). */
  items: readonly CartItemInput[]
  /** Medio de pago elegido en el paso 3. */
  paymentMethod: PaymentMethod
  /** Total que vio el cliente en el resumen, con el envío incluido. */
  expectedTotalArs: number
}

/** Contacto normalizado (email en minúsculas, teléfono de 10 dígitos o `null`), o `null` si no es válido. */
function toCustomer(contact: ContactValues): CustomerInput | null {
  const parsed = checkoutContactSchema.safeParse(contact)
  if (!parsed.success) return null
  const { email, firstName, lastName, phone } = parsed.data
  return { email, firstName, lastName, phone: phone ?? null }
}

/** Envío normalizado con la dirección que pide su método, o `null` si no es válido. */
function toShipping(shipping: ShippingValues): OrderShippingInput | null {
  const parsed = shippingSchema.safeParse(shipping)
  if (!parsed.success) return null
  const value = parsed.data
  switch (value.method) {
    case 'home':
      return {
        method: 'home',
        address: { ...value.address, apartment: value.address.apartment ?? null },
      }
    case 'branch':
      return { method: 'branch', address: value.address }
    case 'pickup':
      return { method: 'pickup', address: null }
  }
}

/**
 * Arma el cuerpo de `POST /orders` (spec 14.2) con los pasos 1 y 2 normalizados por sus schemas,
 * las líneas del carrito y el total que vio el cliente. El campo trampa `website` va vacío.
 *
 * @param parts - Ver {@link OrderInputParts}.
 * @returns El cuerpo del pedido; serializado da siempre el mismo texto para los mismos datos.
 * @throws {RangeError} Si el contacto o el envío no son válidos, si no hay líneas o si el total no
 *   es un entero de pesos.
 */
export function buildOrderInput(parts: OrderInputParts): CreateOrderInput {
  const customer = toCustomer(parts.contact)
  if (customer === null) throw new RangeError('El contacto del pedido no es válido.')
  const shipping = toShipping(parts.shipping)
  if (shipping === null) throw new RangeError('El envío del pedido no es válido.')
  if (parts.items.length === 0)
    throw new RangeError('El pedido tiene que tener al menos una línea.')
  return {
    customer,
    shipping,
    items: [...parts.items],
    paymentMethod: parts.paymentMethod,
    expectedTotalArs: pesos(parts.expectedTotalArs),
    website: '',
  }
}

/**
 * Huella de los datos con los que se crea un pedido: el carrito (`cartHash`), el contacto y el
 * envío ya normalizados. Mientras no cambie, el checkout reutiliza el pedido creado (Ruling
 * P3-5); si cambia, crea uno nuevo con otra `Idempotency-Key`.
 *
 * @param cartHash - Resumen del carrito (`cartHash` de `features/cart`).
 * @param contact - Paso 1, o `null` si no está completo.
 * @param shipping - Paso 2, o `null` si no está completo.
 * @returns La huella, o `null` si el contacto o el envío faltan o no son válidos.
 */
export function orderFingerprint(
  cartHash: string,
  contact: ContactValues | null,
  shipping: ShippingValues | null,
): string | null {
  const customer = contact === null ? null : toCustomer(contact)
  const destination = shipping === null ? null : toShipping(shipping)
  if (customer === null || destination === null) return null
  return JSON.stringify([cartHash, customer, destination])
}

/**
 * Costo fijo del envío de un método (spec 14.1: sale de `PublicSettings.shippingOptions`).
 *
 * @param options - Opciones de envío de los ajustes públicos.
 * @param method - Método elegido, o `null` si todavía no se eligió.
 * @returns El costo en pesos (0 si es gratis), o `null` sin método o si no está habilitado.
 */
export function shippingCost(
  options: readonly ShippingOption[],
  method: ShippingMethod | null,
): number | null {
  if (method === null) return null
  const option = options.find((candidate) => candidate.method === method && candidate.enabled)
  return option === undefined ? null : option.costArs
}
