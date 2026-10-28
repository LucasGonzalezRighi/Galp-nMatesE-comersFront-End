import { describe, expect, it } from 'vitest'
import type { AdminSettings } from '@galpon/api-client'
import { settingsFormSchema } from '@galpon/schemas'
import { settingsFormValues, settingsInput, shippingFieldPath } from './settings-form-values'

/** Ajustes como los devuelve la API, con los envíos fuera de orden y un CUIT cargado. */
const SETTINGS: AdminSettings = {
  kitDiscountPercent: 10,
  shippingOptions: [
    { method: 'pickup', label: 'Retiro en persona', costArs: 0, eta: 'Coordinamos', enabled: true },
    { method: 'home', label: 'Envío a domicilio', costArs: 6500, eta: '3 a 6 días', enabled: true },
    {
      method: 'branch',
      label: 'Envío a sucursal',
      costArs: 4900,
      eta: '2 a 4 días',
      enabled: false,
    },
  ],
  installments: { maxWithoutInterest: 3, showOnProduct: true },
  contactEmail: 'galpon.mates@gmail.com',
  priceDisplay: { showNetPrice: true },
  vatRatePercent: 10.5,
  lowStockThreshold: 3,
  seller: {
    legalName: 'Galpón Mates',
    cuit: '20123456786',
    taxCondition: null,
    address: null,
    phone: null,
    supportArea: null,
    supportHours: null,
    dataFiscalUrl: null,
  },
}

describe('settingsFormValues', () => {
  it('ordena los envíos como SHIPPING_METHODS, muestra el CUIT con guiones y los vacíos como ""', () => {
    const values = settingsFormValues(SETTINGS)

    expect(values.shippingOptions.map((option) => option.method)).toEqual([
      'home',
      'branch',
      'pickup',
    ])
    expect(values.shippingOptions[1]).toEqual({
      method: 'branch',
      costArs: 4900,
      eta: '2 a 4 días',
      enabled: false,
    })
    expect(values.seller.cuit).toBe('20-12345678-6')
    expect(values.seller.legalName).toBe('Galpón Mates')
    expect(values.seller.address).toBe('')
    expect(values.vatRatePercent).toBe(10.5)
  })

  it('lanza RangeError si falta un método de envío', () => {
    const settings = { ...SETTINGS, shippingOptions: SETTINGS.shippingOptions.slice(1) }

    expect(() => settingsFormValues(settings)).toThrow(RangeError)
    expect(() => settingsFormValues(settings)).toThrow('Faltan los datos de envío de "pickup".')
  })
})

describe('settingsInput', () => {
  it('vuelve a armar los ajustes con el nombre fijo de cada envío', () => {
    const form = settingsFormSchema.parse(settingsFormValues(SETTINGS))

    expect(settingsInput(form)).toEqual({
      ...SETTINGS,
      shippingOptions: [
        SETTINGS.shippingOptions[1],
        SETTINGS.shippingOptions[2],
        SETTINGS.shippingOptions[0],
      ],
    })
  })
})

describe('shippingFieldPath', () => {
  it('arma la ruta del campo de cada opción de envío', () => {
    expect(shippingFieldPath(0, 'costArs')).toBe('shippingOptions.0.costArs')
    expect(shippingFieldPath(2, 'eta')).toBe('shippingOptions.2.eta')
  })

  it('lanza RangeError fuera de los métodos de envío', () => {
    expect(() => shippingFieldPath(3, 'eta')).toThrow(RangeError)
    expect(() => shippingFieldPath(-1, 'eta')).toThrow(RangeError)
    expect(() => shippingFieldPath(0.5, 'eta')).toThrow(
      'El lugar de la opción de envío tiene que ser un entero de 0 a 2; se recibió 0.5.',
    )
  })
})
