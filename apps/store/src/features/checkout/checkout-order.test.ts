import { describe, expect, it } from 'vitest'
import type { CartItemInput } from '@galpon/api-client'
import type { ContactValues, ShippingValues } from './checkout.store'
import { buildOrderInput, orderFingerprint, shippingCost } from './checkout-order'

const CONTACT: ContactValues = {
  email: '  Lucia@Ejemplo.com ',
  firstName: 'Lucía',
  lastName: 'Pérez',
  phone: '',
}

const ADDRESS = {
  street: 'Av. Corrientes',
  number: '1234',
  apartment: '',
  postalCode: 'c1043',
  city: 'CABA',
  province: 'CABA',
}

const ITEMS: CartItemInput[] = [
  { type: 'product', productId: 'prd-yerba-canarias', quantity: 2, options: null },
]

const OPTIONS = [
  { method: 'home', label: 'Envío a domicilio', costArs: 6500, eta: '3 a 6 días', enabled: true },
  { method: 'pickup', label: 'Retiro', costArs: 0, eta: 'Coordinamos', enabled: true },
  { method: 'branch', label: 'Sucursal', costArs: 4900, eta: '3 a 6 días', enabled: false },
] as const

describe('buildOrderInput', () => {
  it('normaliza el contacto y manda la dirección completa a domicilio', () => {
    const shipping: ShippingValues = { method: 'home', address: ADDRESS }
    const input = buildOrderInput({
      contact: CONTACT,
      shipping,
      items: ITEMS,
      paymentMethod: 'card',
      expectedTotalArs: 46499,
    })
    expect(input).toEqual({
      customer: { email: 'lucia@ejemplo.com', firstName: 'Lucía', lastName: 'Pérez', phone: null },
      shipping: {
        method: 'home',
        address: { ...ADDRESS, apartment: null, postalCode: 'C1043' },
      },
      items: ITEMS,
      paymentMethod: 'card',
      expectedTotalArs: 46499,
      website: '',
    })
  })

  it('a sucursal manda solo código postal, ciudad y provincia; el retiro va sin dirección', () => {
    const branch = buildOrderInput({
      contact: { ...CONTACT, phone: '11 2345-6789' },
      shipping: { method: 'branch', address: ADDRESS },
      items: ITEMS,
      paymentMethod: 'mp_redirect',
      expectedTotalArs: 1000,
    })
    expect(branch.customer.phone).toBe('1123456789')
    expect(branch.shipping).toEqual({
      method: 'branch',
      address: { postalCode: 'C1043', city: 'CABA', province: 'CABA' },
    })
    const pickup = buildOrderInput({
      contact: CONTACT,
      shipping: { method: 'pickup', address: ADDRESS },
      items: ITEMS,
      paymentMethod: 'mp_redirect',
      expectedTotalArs: 1000,
    })
    expect(pickup.shipping).toEqual({ method: 'pickup', address: null })
  })

  it('lanza RangeError con un paso incompleto, sin líneas o con un total inválido', () => {
    const base = {
      contact: CONTACT,
      shipping: { method: 'pickup', address: ADDRESS } satisfies ShippingValues,
      items: ITEMS,
      paymentMethod: 'card',
      expectedTotalArs: 1000,
    } as const
    expect(() => buildOrderInput({ ...base, contact: { ...CONTACT, email: 'no' } })).toThrow(
      RangeError,
    )
    expect(() =>
      buildOrderInput({ ...base, shipping: { method: 'home', address: { ...ADDRESS, city: '' } } }),
    ).toThrow(RangeError)
    expect(() => buildOrderInput({ ...base, items: [] })).toThrow(RangeError)
    expect(() => buildOrderInput({ ...base, expectedTotalArs: 10.5 })).toThrow(RangeError)
  })
})

describe('orderFingerprint', () => {
  it('es la misma con los mismos datos normalizados y cambia con el carrito o el envío', () => {
    const shipping: ShippingValues = { method: 'pickup', address: ADDRESS }
    const first = orderFingerprint('abc', CONTACT, shipping)
    expect(orderFingerprint('abc', { ...CONTACT, email: 'lucia@ejemplo.com' }, shipping)).toBe(
      first,
    )
    expect(orderFingerprint('abd', CONTACT, shipping)).not.toBe(first)
    expect(orderFingerprint('abc', CONTACT, { method: 'home', address: ADDRESS })).not.toBe(first)
  })

  it('es null si el contacto o el envío no están completos', () => {
    expect(orderFingerprint('abc', null, { method: 'pickup', address: ADDRESS })).toBeNull()
    expect(orderFingerprint('abc', CONTACT, null)).toBeNull()
  })
})

describe('shippingCost', () => {
  it('devuelve el costo del método habilitado, o null si no hay método o no está habilitado', () => {
    expect(shippingCost(OPTIONS, 'home')).toBe(6500)
    expect(shippingCost(OPTIONS, 'pickup')).toBe(0)
    expect(shippingCost(OPTIONS, 'branch')).toBeNull()
    expect(shippingCost(OPTIONS, null)).toBeNull()
  })
})
