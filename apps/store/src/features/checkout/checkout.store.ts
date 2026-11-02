import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ShippingMethod } from '@galpon/domain'
import { isOrderNumber, SHIPPING_METHODS } from '@galpon/domain'

/** Clave de `sessionStorage` donde se guardan los pasos del checkout (spec 14.1). */
export const CHECKOUT_STORAGE_KEY = 'galpon.checkout'

/** Versión del formato guardado; un formato desconocido se descarta. */
export const CHECKOUT_STORAGE_VERSION = 1

/** Paso del checkout: 0 Contacto, 1 Envío y 2 Pago. */
export type CheckoutStep = 0 | 1 | 2

/** Paso 1 tal como lo escribió la persona (se valida con `checkoutContactSchema`). */
export interface ContactValues {
  /** Email. */
  email: string
  /** Nombre. */
  firstName: string
  /** Apellido. */
  lastName: string
  /** Teléfono opcional; vacío si no lo cargó. */
  phone: string
}

/** Campos de la dirección tal como los escribió la persona; los que el método no pide quedan vacíos. */
export interface AddressValues {
  /** Calle. */
  street: string
  /** Número o "S/N". */
  number: string
  /** Piso o departamento, opcional. */
  apartment: string
  /** Código postal. */
  postalCode: string
  /** Ciudad. */
  city: string
  /** Provincia; vacía si no se eligió. */
  province: string
}

/** Paso 2 tal como lo completó la persona (se valida con `shippingSchema`). */
export interface ShippingValues {
  /** Método de envío elegido. */
  method: ShippingMethod
  /** Dirección; el retiro en persona no la usa. */
  address: AddressValues
}

/** Intento de crear el pedido: la `Idempotency-Key` y el cuerpo con el que se usó. */
export interface OrderAttempt {
  /** UUID v4 de `POST /orders`; se reutiliza solo para reintentar el mismo cuerpo. */
  key: string
  /** Cuerpo serializado del pedido que se mandó con esa clave. */
  body: string
}

/** Pedido creado por el checkout y los datos (carrito, contacto y envío) con los que se creó. */
export interface CheckoutOrderRef {
  /** Número del pedido (`GLP-` y cinco dígitos). */
  number: string
  /** Huella del carrito, el contacto y el envío del pedido (`orderFingerprint`). */
  fingerprint: string
}

/** Lo que se guarda en `sessionStorage`: nunca datos de la tarjeta. */
interface PersistedCheckout {
  /** Paso actual. */
  step: CheckoutStep
  /** Paso 1 completo, o `null` si todavía no se completó. */
  contact: ContactValues | null
  /** Paso 2 completo, o `null` si todavía no se completó. */
  shipping: ShippingValues | null
  /** Intento de crear el pedido que todavía no terminó bien, o `null`. */
  attempt: OrderAttempt | null
  /** Pedido creado para estos datos, o `null`. */
  order: CheckoutOrderRef | null
}

/** Estado y acciones del checkout. */
export interface CheckoutState extends PersistedCheckout {
  /** Si ya se leyó `sessionStorage`; hasta entonces el checkout muestra el esqueleto. */
  hasHydrated: boolean
  /** Guarda el paso 1 y pasa al envío. */
  saveContact: (contact: ContactValues) => void
  /** Guarda el paso 2 y pasa al pago. */
  saveShipping: (shipping: ShippingValues) => void
  /**
   * Vuelve a un paso anterior (la barra solo deja ir hacia atrás); a uno posterior no hace nada.
   *
   * @throws {RangeError} Si el paso no es 0, 1 o 2.
   */
  goToStep: (step: number) => void
  /**
   * Vuelve al pago con un pedido ya creado (por ejemplo, "Probar con otro medio"). Solo si los
   * pasos 1 y 2 están completos.
   *
   * @returns Si se pudo retomar.
   */
  resumePayment: (order: CheckoutOrderRef) => boolean
  /** Guarda o borra el intento de crear el pedido. */
  setAttempt: (attempt: OrderAttempt | null) => void
  /** Guarda o borra el pedido creado. */
  setOrder: (order: CheckoutOrderRef | null) => void
  /** Marca que ya se leyó `sessionStorage`. */
  markHydrated: () => void
}

/** Checkout vacío. */
const EMPTY: PersistedCheckout = {
  step: 0,
  contact: null,
  shipping: null,
  attempt: null,
  order: null,
}

/** Si un valor es un objeto con estas claves de texto. */
function hasStrings<K extends string>(
  value: unknown,
  keys: readonly K[],
): value is Record<K, string> {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return keys.every((key) => typeof record[key] === 'string')
}

/** Contacto guardado, o `null` si no tiene forma. */
function parseContact(value: unknown): ContactValues | null {
  if (!hasStrings(value, ['email', 'firstName', 'lastName', 'phone'] as const)) return null
  return {
    email: value.email,
    firstName: value.firstName,
    lastName: value.lastName,
    phone: value.phone,
  }
}

/** Envío guardado, o `null` si no tiene forma. */
function parseShipping(value: unknown): ShippingValues | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const method = SHIPPING_METHODS.find((candidate) => candidate === record.method)
  const address = record.address
  const fields = ['street', 'number', 'apartment', 'postalCode', 'city', 'province'] as const
  if (method === undefined || !hasStrings(address, fields)) return null
  return {
    method,
    address: {
      street: address.street,
      number: address.number,
      apartment: address.apartment,
      postalCode: address.postalCode,
      city: address.city,
      province: address.province,
    },
  }
}

/** Intento guardado, o `null` si no tiene forma. */
function parseAttempt(value: unknown): OrderAttempt | null {
  if (!hasStrings(value, ['key', 'body'] as const)) return null
  return { key: value.key, body: value.body }
}

/** Pedido guardado, o `null` si no tiene forma. */
function parseOrder(value: unknown): CheckoutOrderRef | null {
  if (!hasStrings(value, ['number', 'fingerprint'] as const) || !isOrderNumber(value.number)) {
    return null
  }
  return { number: value.number, fingerprint: value.fingerprint }
}

/** El paso guardado, sin pasar del último paso completo. */
function reachableStep(
  step: unknown,
  contact: ContactValues | null,
  shipping: ShippingValues | null,
): CheckoutStep {
  const wanted = step === 1 || step === 2 ? step : 0
  if (contact === null) return 0
  if (shipping === null) return wanted === 0 ? 0 : 1
  return wanted
}

/** Valida que el paso sea 0, 1 o 2. */
function assertStep(step: number): asserts step is CheckoutStep {
  if (step !== 0 && step !== 1 && step !== 2) {
    throw new RangeError(`El paso tiene que ser 0, 1 o 2; se recibió ${String(step)}.`)
  }
}

/**
 * Store del checkout (Zustand + `persist` en `sessionStorage`, spec 14.1): paso, contacto,
 * envío y el pedido en curso, para que recargar la página no los pierda (RF 5). Los datos de la
 * tarjeta nunca pasan por acá.
 *
 * Usa `skipHydration`: el checkout llama a {@link ensureCheckoutHydrated} en un efecto, así el
 * servidor y la primera pintura del cliente coinciden. Lo guardado se valida al leerlo y el paso
 * vuelve al último completo.
 */
export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      hasHydrated: false,
      saveContact: (contact) => {
        set({ contact, step: 1 })
      },
      saveShipping: (shipping) => {
        set({ shipping, step: 2 })
      },
      goToStep: (step) => {
        assertStep(step)
        if (step < get().step) set({ step })
      },
      resumePayment: (order) => {
        const { contact, shipping } = get()
        if (contact === null || shipping === null) return false
        set({ order, step: 2 })
        return true
      },
      setAttempt: (attempt) => {
        set({ attempt })
      },
      setOrder: (order) => {
        set({ order })
      },
      markHydrated: () => {
        set({ hasHydrated: true })
      },
    }),
    {
      name: CHECKOUT_STORAGE_KEY,
      version: CHECKOUT_STORAGE_VERSION,
      skipHydration: true,
      // Sin `sessionStorage` (servidor, modo privado estricto) el checkout sigue en memoria.
      storage: createJSONStorage<PersistedCheckout>(() => sessionStorage),
      partialize: (state): PersistedCheckout => ({
        step: state.step,
        contact: state.contact,
        shipping: state.shipping,
        attempt: state.attempt,
        order: state.order,
      }),
      migrate: (): PersistedCheckout => EMPTY,
      merge: (persisted, current) => {
        const stored: Record<string, unknown> =
          typeof persisted === 'object' && persisted !== null ? { ...persisted } : {}
        const contact = parseContact(stored.contact)
        const shipping = parseShipping(stored.shipping)
        return {
          ...current,
          contact,
          shipping,
          step: reachableStep(stored.step, contact, shipping),
          attempt: parseAttempt(stored.attempt),
          order: parseOrder(stored.order),
        }
      },
    },
  ),
)

/**
 * Lee `sessionStorage` y marca el checkout como hidratado, si todavía no se hizo. Es síncrona
 * (el almacenamiento es síncrono).
 */
export function ensureCheckoutHydrated(): void {
  if (useCheckoutStore.getState().hasHydrated) return
  void useCheckoutStore.persist.rehydrate()
  useCheckoutStore.getState().markHydrated()
}

/**
 * Vuelve el store a su estado inicial sin hidratar, como una pestaña recién cargada: lo guardado
 * en `sessionStorage` queda como estaba (`persist` lo escribiría al cambiar el estado, así que se
 * repone). Sirve para los tests, que simulan así una recarga de la página.
 */
export function resetCheckoutStore(): void {
  let stored: string | null = null
  try {
    stored = sessionStorage.getItem(CHECKOUT_STORAGE_KEY)
  } catch {
    stored = null
  }
  useCheckoutStore.setState({ ...EMPTY, hasHydrated: false })
  try {
    if (stored === null) sessionStorage.removeItem(CHECKOUT_STORAGE_KEY)
    else sessionStorage.setItem(CHECKOUT_STORAGE_KEY, stored)
  } catch {
    // Sin `sessionStorage` no hay nada que reponer.
  }
}
