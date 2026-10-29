import type { Category, ProductSummary } from '@galpon/api-client'
import type { ProductGroup } from '@galpon/domain'
import { PRODUCT_GROUPS } from '@galpon/domain'

/** Cifras del inicio que salen del catálogo publicado (spec 9.5, "Cifras"). */
export interface HomeStats {
  /** Piezas publicadas en el catálogo. */
  pieces: number
  /** Líneas de producto con al menos una pieza publicada. */
  lines: number
  /** Opciones de cada paso del kit: solo las piezas que se pueden comprar. */
  kitOptions: Record<ProductGroup, number>
}

/**
 * Calcula las cifras del inicio a partir del catálogo publicado: piezas, líneas y cantidad de
 * opciones comprables por grupo del kit. Las provincias con envío y los socios no salen de acá: son
 * texto editable (`HomeContent.stats`).
 *
 * @param products - Productos publicados, tal como los devuelve el listado de la API.
 * @param categories - Líneas de producto; las que no tienen piezas publicadas no se cuentan.
 * @returns Las cifras.
 * @throws {RangeError} Si la cantidad de productos de una línea no es un entero mayor o igual a 0.
 * @example
 * computeHomeStats(products, categories).pieces // 27
 */
export function computeHomeStats(
  products: readonly ProductSummary[],
  categories: readonly Category[],
): HomeStats {
  for (const category of categories) {
    if (!Number.isInteger(category.productCount) || category.productCount < 0) {
      throw new RangeError(
        `La cantidad de productos de la línea "${category.name}" tiene que ser un entero mayor o igual a 0; se recibió ${String(category.productCount)}.`,
      )
    }
  }
  const withProducts = categories.filter((category) => category.productCount > 0)
  const kitOptions: Record<ProductGroup, number> = { mate: 0, bombilla: 0, yerba: 0 }
  for (const group of PRODUCT_GROUPS) {
    kitOptions[group] = products.filter(
      (product) => product.group === group && product.isPurchasable,
    ).length
  }
  return {
    pieces: products.length,
    lines: withProducts.length,
    kitOptions,
  }
}
