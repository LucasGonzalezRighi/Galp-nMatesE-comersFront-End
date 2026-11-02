import type { FieldPath } from 'react-hook-form'
import type { AdminSettings } from '@galpon/api-client'
import type { SettingsForm, SettingsFormInput } from '@galpon/schemas'
import { formatCuit, SHIPPING_METHODS } from '@galpon/domain'
import { SETTINGS_COPY } from './settings.copy'

/** CUIT guardado: los 11 dígitos pegados (si llegara otra cosa, se muestra tal cual). */
const STORED_CUIT_PATTERN = /^\d{11}$/

/** Campos de una opción de envío que se editan. */
const SHIPPING_FIELDS = ['costArs', 'eta', 'enabled'] as const

/** Campo editable de una opción de envío. */
export type ShippingField = (typeof SHIPPING_FIELDS)[number]

/** Datos del vendedor del formulario, en el orden en que se muestran. */
const SELLER_FIELDS = [
  'legalName',
  'cuit',
  'taxCondition',
  'address',
  'phone',
  'supportArea',
  'supportHours',
  'dataFiscalUrl',
] as const

/**
 * Rutas de los campos del formulario de ajustes, las mismas del contrato: un `422` trae sus
 * errores con estas rutas (`seller.cuit`, `shippingOptions.0.costArs`) y van a cada campo.
 */
export const SETTINGS_FIELDS: readonly FieldPath<SettingsFormInput>[] = [
  'kitDiscountPercent',
  'shippingOptions',
  ...SHIPPING_METHODS.flatMap((_method, index) =>
    SHIPPING_FIELDS.map((field) => shippingFieldPath(index, field)),
  ),
  'installments.maxWithoutInterest',
  'installments.showOnProduct',
  'contactEmail',
  'lowStockThreshold',
  'vatRatePercent',
  'priceDisplay.showNetPrice',
  ...SELLER_FIELDS.map((field) => `seller.${field}` as const),
]

/**
 * Ruta en el formulario de un campo de la opción de envío que está en el lugar `index`.
 *
 * @param index - Lugar de la opción en `shippingOptions` (el orden de `SHIPPING_METHODS`).
 * @param field - Campo de la opción.
 * @returns La ruta, por ejemplo `shippingOptions.0.costArs`.
 * @throws {RangeError} Si `index` no es el lugar de un método de envío.
 * @example
 * shippingFieldPath(2, 'eta') // "shippingOptions.2.eta"
 */
export function shippingFieldPath<K extends ShippingField>(
  index: number,
  field: K,
): `shippingOptions.${number}.${K}` {
  if (!Number.isInteger(index) || index < 0 || index >= SHIPPING_METHODS.length) {
    throw new RangeError(
      `El lugar de la opción de envío tiene que ser un entero de 0 a ${String(SHIPPING_METHODS.length - 1)}; se recibió ${String(index)}.`,
    )
  }
  return `shippingOptions.${String(index)}.${field}` as `shippingOptions.${number}.${K}`
}

/** El CUIT guardado como se muestra en el campo: con guiones, o vacío si no se cargó. */
function cuitText(cuit: string | null): string {
  if (cuit === null) return ''
  return STORED_CUIT_PATTERN.test(cuit) ? formatCuit(cuit) : cuit
}

/**
 * Valores del formulario a partir de los ajustes guardados: los envíos en el orden de
 * `SHIPPING_METHODS` y sin su nombre (que no se edita), el CUIT con guiones (`formatCuit`) y cada
 * dato del vendedor sin cargar como texto vacío.
 *
 * @param settings - Ajustes como los devuelve la API.
 * @returns Los valores iniciales para `settingsFormSchema`.
 * @throws {RangeError} Si falta la opción de algún método de envío.
 */
export function settingsFormValues(settings: AdminSettings): SettingsFormInput {
  const shippingOptions = SHIPPING_METHODS.map((method) => {
    const option = settings.shippingOptions.find((candidate) => candidate.method === method)
    if (option === undefined) throw new RangeError(`Faltan los datos de envío de "${method}".`)
    return { method, costArs: option.costArs, eta: option.eta, enabled: option.enabled }
  })
  const { seller } = settings
  return {
    kitDiscountPercent: settings.kitDiscountPercent,
    shippingOptions,
    installments: { ...settings.installments },
    contactEmail: settings.contactEmail,
    lowStockThreshold: settings.lowStockThreshold,
    vatRatePercent: settings.vatRatePercent,
    priceDisplay: { ...settings.priceDisplay },
    seller: {
      legalName: seller.legalName ?? '',
      cuit: cuitText(seller.cuit),
      taxCondition: seller.taxCondition ?? '',
      address: seller.address ?? '',
      phone: seller.phone ?? '',
      supportArea: seller.supportArea ?? '',
      supportHours: seller.supportHours ?? '',
      dataFiscalUrl: seller.dataFiscalUrl ?? '',
    },
  }
}

/**
 * Ajustes para `PUT /admin/settings` a partir del formulario ya validado: cada envío vuelve con
 * su nombre fijo (el back conserva el suyo de todos modos).
 *
 * @param form - Ajustes validados por `settingsFormSchema`.
 * @returns Los ajustes completos que pide `updateAdminSettings`.
 */
export function settingsInput(form: SettingsForm): AdminSettings {
  return {
    ...form,
    shippingOptions: form.shippingOptions.map((option) => ({
      ...option,
      label: SETTINGS_COPY.shipping.methods[option.method],
    })),
  }
}
