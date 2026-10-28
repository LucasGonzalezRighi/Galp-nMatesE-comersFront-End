import { formatPesos, pesos } from '@galpon/domain'
import type { StatusBadge } from './products.copy'
import { PRODUCTS_COPY } from './products.copy'

/**
 * Precio de un producto para la tabla.
 *
 * @param priceArs - Precio en pesos enteros, o `null` si es "a consultar".
 * @returns "$39.999" (con `formatPesos`) o "A consultar".
 */
export function priceText(priceArs: number | null): string {
  return priceArs === null ? PRODUCTS_COPY.onRequest : formatPesos(pesos(priceArs))
}

/**
 * Badge del stock: "Sin stock" con 0 y "Poco stock" hasta el umbral de los ajustes
 * (`lowStockThreshold`, el mismo con el que el resumen arma su lista de poco stock).
 *
 * @param stock - Unidades en stock, un entero desde 0.
 * @param lowStockThreshold - Umbral de los ajustes, o `null` si todavía no cargaron.
 * @returns El badge, o `null` si el stock alcanza.
 * @throws {RangeError} Si el stock no es un entero desde 0.
 */
export function stockBadge(stock: number, lowStockThreshold: number | null): StatusBadge | null {
  if (!Number.isInteger(stock) || stock < 0) {
    throw new RangeError(`El stock tiene que ser un entero desde 0; se recibió ${String(stock)}.`)
  }
  if (stock === 0) return { label: PRODUCTS_COPY.outOfStock, tone: 'danger' }
  if (lowStockThreshold !== null && stock <= lowStockThreshold) {
    return { label: PRODUCTS_COPY.lowStock, tone: 'accent' }
  }
  return null
}
