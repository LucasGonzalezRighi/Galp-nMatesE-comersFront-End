import { DEFAULT_SHIPPING_OPTIONS } from '@galpon/domain'
import type { AdminSettings } from '../../generated/schema'

/**
 * Ajustes de ejemplo de la tienda: el descuento del kit, los envíos y las cuotas del diseño, con
 * IVA al 21 % y los datos del vendedor todavía sin cargar.
 */
export const FIXTURE_SETTINGS: AdminSettings = {
  kitDiscountPercent: 10,
  // `DEFAULT_SHIPPING_OPTIONS` es de solo lectura y compartido: cada base parte de su propia copia.
  shippingOptions: structuredClone([...DEFAULT_SHIPPING_OPTIONS]),
  installments: { maxWithoutInterest: 3, showOnProduct: true },
  contactEmail: 'galpon.mates@gmail.com',
  priceDisplay: { showNetPrice: true },
  vatRatePercent: 21,
  lowStockThreshold: 3,
  seller: {
    legalName: null,
    cuit: null,
    taxCondition: null,
    address: null,
    phone: null,
    supportArea: null,
    supportHours: null,
    dataFiscalUrl: null,
  },
}
