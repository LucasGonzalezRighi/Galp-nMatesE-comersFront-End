// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { ContactValues, ShippingValues } from './checkout.store'
import {
  CHECKOUT_STORAGE_KEY,
  CHECKOUT_STORAGE_VERSION,
  ensureCheckoutHydrated,
  resetCheckoutStore,
  useCheckoutStore,
} from './checkout.store'

const CONTACT: ContactValues = {
  email: 'lucia@ejemplo.com',
  firstName: 'Lucía',
  lastName: 'Pérez',
  phone: '',
}

const SHIPPING: ShippingValues = {
  method: 'pickup',
  address: { street: '', number: '', apartment: '', postalCode: '', city: '', province: '' },
}

/** Guarda en `sessionStorage` lo que dejaría una pestaña anterior. */
function storeRaw(state: unknown): void {
  sessionStorage.setItem(
    CHECKOUT_STORAGE_KEY,
    JSON.stringify({ state, version: CHECKOUT_STORAGE_VERSION }),
  )
}

beforeEach(() => {
  sessionStorage.clear()
  resetCheckoutStore()
})

describe('checkout.store', () => {
  it('avanza al guardar cada paso y lo deja en sessionStorage, sin datos de tarjeta', () => {
    ensureCheckoutHydrated()
    useCheckoutStore.getState().saveContact(CONTACT)
    expect(useCheckoutStore.getState().step).toBe(1)
    useCheckoutStore.getState().saveShipping(SHIPPING)
    expect(useCheckoutStore.getState().step).toBe(2)

    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY) ?? ''
    expect(JSON.parse(raw)).toMatchObject({
      state: { step: 2, contact: CONTACT, shipping: SHIPPING, attempt: null, order: null },
    })
    expect(Object.keys((JSON.parse(raw) as { state: object }).state).sort()).toEqual([
      'attempt',
      'contact',
      'order',
      'shipping',
      'step',
    ])
  })

  it('al recargar recupera el paso, el contacto y el envío', () => {
    storeRaw({ step: 2, contact: CONTACT, shipping: SHIPPING, attempt: null, order: null })
    ensureCheckoutHydrated()
    const state = useCheckoutStore.getState()
    expect(state.hasHydrated).toBe(true)
    expect(state.step).toBe(2)
    expect(state.contact).toEqual(CONTACT)
    expect(state.shipping).toEqual(SHIPPING)
  })

  it('vuelve al último paso completo si lo guardado no alcanza para el paso', () => {
    storeRaw({ step: 2, contact: CONTACT, shipping: null })
    ensureCheckoutHydrated()
    expect(useCheckoutStore.getState().step).toBe(1)
  })

  it('descarta lo guardado que no tiene forma y empieza en el paso 1', () => {
    storeRaw({ step: 7, contact: { email: 3 }, shipping: { method: 'drone' }, attempt: 'x' })
    ensureCheckoutHydrated()
    const state = useCheckoutStore.getState()
    expect(state.step).toBe(0)
    expect(state.contact).toBeNull()
    expect(state.shipping).toBeNull()
    expect(state.attempt).toBeNull()
  })

  it('solo deja volver a un paso anterior', () => {
    ensureCheckoutHydrated()
    useCheckoutStore.getState().saveContact(CONTACT)
    useCheckoutStore.getState().goToStep(2)
    expect(useCheckoutStore.getState().step).toBe(1)
    useCheckoutStore.getState().goToStep(0)
    expect(useCheckoutStore.getState().step).toBe(0)
    expect(useCheckoutStore.getState().contact).toEqual(CONTACT)
  })

  it('retoma el pago de un pedido solo si ya tiene contacto y envío', () => {
    ensureCheckoutHydrated()
    const order = { number: 'GLP-00042', fingerprint: 'f' }
    expect(useCheckoutStore.getState().resumePayment(order)).toBe(false)
    useCheckoutStore.getState().saveContact(CONTACT)
    useCheckoutStore.getState().saveShipping(SHIPPING)
    useCheckoutStore.getState().goToStep(0)
    expect(useCheckoutStore.getState().resumePayment(order)).toBe(true)
    expect(useCheckoutStore.getState()).toMatchObject({ step: 2, order })
  })

  it('valida el paso al que se quiere volver', () => {
    expect(() => {
      useCheckoutStore.getState().goToStep(1.5)
    }).toThrow(RangeError)
  })
})
