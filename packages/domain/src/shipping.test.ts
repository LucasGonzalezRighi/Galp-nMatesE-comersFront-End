import { describe, expect, it } from 'vitest'
import { pesos } from './money'
import {
  ADDRESS_FIELDS_BY_METHOD,
  DEFAULT_SHIPPING_OPTIONS,
  PROVINCES,
  SHIPPING_METHODS,
} from './shipping'

describe('SHIPPING_METHODS', () => {
  it('son domicilio, sucursal y retiro, en ese orden', () => {
    expect(SHIPPING_METHODS).toEqual(['home', 'branch', 'pickup'])
  })
})

describe('DEFAULT_SHIPPING_OPTIONS', () => {
  it('es exactamente la oferta de envíos del diseño', () => {
    expect(DEFAULT_SHIPPING_OPTIONS).toEqual([
      {
        method: 'home',
        label: 'Envío a domicilio',
        costArs: 6500,
        eta: '3 a 6 días hábiles',
        enabled: true,
      },
      {
        method: 'branch',
        label: 'Envío a sucursal',
        costArs: 4900,
        eta: '3 a 6 días hábiles',
        enabled: true,
      },
      {
        method: 'pickup',
        label: 'Retiro en persona',
        costArs: 0,
        eta: 'Coordinamos por mail',
        enabled: true,
      },
    ])
  })
  it('tiene una opción por cada método, en el mismo orden', () => {
    expect(DEFAULT_SHIPPING_OPTIONS.map((option) => option.method)).toEqual([...SHIPPING_METHODS])
  })
  it('los costos son montos en pesos válidos', () => {
    for (const option of DEFAULT_SHIPPING_OPTIONS) {
      expect(pesos(option.costArs)).toBe(option.costArs)
    }
  })
})

describe('ADDRESS_FIELDS_BY_METHOD', () => {
  it('a domicilio pide la dirección completa', () => {
    expect(ADDRESS_FIELDS_BY_METHOD.home).toEqual([
      'street',
      'number',
      'apartment',
      'postalCode',
      'city',
      'province',
    ])
  })
  it('a sucursal pide solo código postal, ciudad y provincia', () => {
    expect(ADDRESS_FIELDS_BY_METHOD.branch).toEqual(['postalCode', 'city', 'province'])
  })
  it('el retiro en persona no pide dirección', () => {
    expect(ADDRESS_FIELDS_BY_METHOD.pickup).toEqual([])
  })
  it('define los campos de todos los métodos', () => {
    expect(Object.keys(ADDRESS_FIELDS_BY_METHOD).sort()).toEqual([...SHIPPING_METHODS].sort())
  })
})

describe('PROVINCES', () => {
  it('son las 24 jurisdicciones, con el texto exacto del diseño', () => {
    expect(PROVINCES).toEqual([
      'Buenos Aires',
      'CABA',
      'Catamarca',
      'Chaco',
      'Chubut',
      'Córdoba',
      'Corrientes',
      'Entre Ríos',
      'Formosa',
      'Jujuy',
      'La Pampa',
      'La Rioja',
      'Mendoza',
      'Misiones',
      'Neuquén',
      'Río Negro',
      'Salta',
      'San Juan',
      'San Luis',
      'Santa Cruz',
      'Santa Fe',
      'Santiago del Estero',
      'Tierra del Fuego',
      'Tucumán',
    ])
    expect(PROVINCES).toHaveLength(24)
  })
  it('incluye CABA y Tierra del Fuego', () => {
    expect(PROVINCES).toContain('CABA')
    expect(PROVINCES).toContain('Tierra del Fuego')
  })
  it('no repite ninguna', () => {
    expect(new Set(PROVINCES).size).toBe(PROVINCES.length)
  })
})
