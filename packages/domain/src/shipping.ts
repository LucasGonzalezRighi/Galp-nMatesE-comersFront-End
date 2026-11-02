import type { Pesos } from './money'
import { pesos } from './money'

/** Métodos de envío que ofrece la tienda. */
export const SHIPPING_METHODS = ['home', 'branch', 'pickup'] as const

/** Método de envío: a domicilio, a sucursal o retiro en persona. */
export type ShippingMethod = (typeof SHIPPING_METHODS)[number]

/** Opción de envío que se muestra en el checkout. */
export interface ShippingOption {
  /** Método al que corresponde la opción. */
  method: ShippingMethod
  /** Nombre que ve el cliente, por ejemplo "Envío a domicilio". */
  label: string
  /** Costo del envío en pesos; 0 si es gratis. */
  costArs: Pesos
  /** Plazo estimado de entrega, en texto libre. */
  eta: string
  /** Si la opción está disponible para elegir. */
  enabled: boolean
}

/** Opciones de envío de fábrica: lo que muestra el diseño y lo que el admin puede ajustar. */
export const DEFAULT_SHIPPING_OPTIONS: readonly ShippingOption[] = [
  {
    method: 'home',
    label: 'Envío a domicilio',
    costArs: pesos(6500),
    eta: '3 a 6 días hábiles',
    enabled: true,
  },
  {
    method: 'branch',
    label: 'Envío a sucursal',
    costArs: pesos(4900),
    eta: '3 a 6 días hábiles',
    enabled: true,
  },
  {
    method: 'pickup',
    label: 'Retiro en persona',
    costArs: pesos(0),
    eta: 'Coordinamos por mail',
    enabled: true,
  },
]

/** Campos de la dirección de entrega. */
export type AddressField = 'apartment' | 'city' | 'number' | 'postalCode' | 'province' | 'street'

/**
 * Campos de dirección que se piden según el método de envío, en el orden del formulario.
 *
 * El retiro en persona no pide ninguno.
 */
export const ADDRESS_FIELDS_BY_METHOD: Readonly<Record<ShippingMethod, readonly AddressField[]>> = {
  home: ['street', 'number', 'apartment', 'postalCode', 'city', 'province'],
  branch: ['postalCode', 'city', 'province'],
  pickup: [],
}

/** Las 24 jurisdicciones del selector de provincia, con el texto exacto del diseño. */
export const PROVINCES = [
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
] as const

/** Provincia (o CABA) en la que se entrega un pedido. */
export type Province = (typeof PROVINCES)[number]
