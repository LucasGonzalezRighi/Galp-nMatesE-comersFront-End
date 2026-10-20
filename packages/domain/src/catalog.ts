import type { Pesos } from './money'

/** Grupos de productos de la tienda. */
export const PRODUCT_GROUPS = ['mate', 'bombilla', 'yerba'] as const

/** Grupo al que pertenece un producto. */
export type ProductGroup = (typeof PRODUCT_GROUPS)[number]

/** Estados de publicación de un producto. */
export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const

/** Estado de publicación de un producto. */
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

/** Máximo de unidades de un mismo producto que se pueden comprar. */
export const MAX_QUANTITY_PER_PRODUCT = 20

/** Cantidad de productos relacionados que se muestran si no se pide otra. */
const DEFAULT_RELATED_LIMIT = 4

/**
 * Indica si un producto se puede agregar al carrito.
 *
 * Tiene que estar publicado, con precio (no "a consultar") y con stock.
 *
 * @param product - Estado, precio y stock del producto.
 * @returns `true` si se puede comprar.
 */
export function isPurchasable(product: {
  status: ProductStatus
  priceArs: Pesos | null
  stock: number
}): boolean {
  return product.status === 'published' && product.priceArs !== null && product.stock > 0
}

/**
 * Calcula cuántas unidades de un producto se pueden comprar como máximo.
 *
 * @param stock - Unidades disponibles.
 * @returns El menor entre el stock y {@link MAX_QUANTITY_PER_PRODUCT}; nunca negativo.
 * @example
 * maxQuantity(50) // 20
 * maxQuantity(3) // 3
 */
export function maxQuantity(stock: number): number {
  return Math.max(0, Math.min(MAX_QUANTITY_PER_PRODUCT, stock))
}

/**
 * Da formato al código correlativo de un producto.
 *
 * @param sequence - Número correlativo que asigna el back al crear el producto.
 * @returns El código, con al menos dos dígitos.
 * @example
 * formatProductCode(7) // "N°07"
 */
export function formatProductCode(sequence: number): string {
  return `N°${String(sequence).padStart(2, '0')}`
}

/** Órdenes en que se puede listar el catálogo: destacados, menor precio, mayor precio y A-Z. */
export const PRODUCT_SORT_ORDERS = ['destacados', 'menor', 'mayor', 'az'] as const

/** Orden del listado del catálogo. */
export type ProductSortOrder = (typeof PRODUCT_SORT_ORDERS)[number]

/**
 * Indica si un texto es uno de los órdenes del catálogo (por ejemplo, el de `?orden=`).
 *
 * @param value - Texto a revisar.
 * @returns `true` si es un {@link ProductSortOrder}.
 */
export function isProductSortOrder(value: string): value is ProductSortOrder {
  return (PRODUCT_SORT_ORDERS as readonly string[]).includes(value)
}

/**
 * Compara dos precios; los productos "a consultar" (`null`) quedan siempre al final.
 *
 * @param direction - `1` para ascendente, `-1` para descendente.
 */
function comparePrices(a: Pesos | null, b: Pesos | null, direction: 1 | -1): number {
  if (a === null || b === null) {
    return Number(a === null) - Number(b === null)
  }
  return (a - b) * direction
}

/**
 * Ordena productos sin modificar la lista original.
 *
 * El orden es estable: los productos que empatan conservan el orden de entrada.
 * `'az'` compara por nombre según el español, así "Ángel" va antes que "Azul".
 *
 * @param items - Productos a ordenar.
 * @param order - Criterio de orden.
 * @returns Una lista nueva con los productos ordenados.
 */
export function sortProducts<T extends { name: string; priceArs: Pesos | null; featured: boolean }>(
  items: readonly T[],
  order: ProductSortOrder,
): T[] {
  const copy = [...items]
  switch (order) {
    case 'destacados':
      return copy.sort((a, b) => Number(b.featured) - Number(a.featured))
    case 'menor':
      return copy.sort((a, b) => comparePrices(a.priceArs, b.priceArs, 1))
    case 'mayor':
      return copy.sort((a, b) => comparePrices(a.priceArs, b.priceArs, -1))
    case 'az':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }
}

/**
 * Elige los productos relacionados con uno.
 *
 * Primero van los de la misma línea (sin el propio producto) y después los del mismo
 * grupo en otras líneas, cada tramo en el orden del catálogo. Nunca incluye otro grupo.
 *
 * @param product - Producto del que se buscan relacionados.
 * @param catalog - Productos entre los que elegir.
 * @param limit - Máximo de relacionados; por defecto 4.
 * @returns Hasta `limit` productos; menos si no hay suficientes.
 */
export function selectRelated<T extends { id: string; categoryId: string; group: ProductGroup }>(
  product: T,
  catalog: readonly T[],
  limit: number = DEFAULT_RELATED_LIMIT,
): T[] {
  const sameGroup = catalog.filter(
    (other) => other.id !== product.id && other.group === product.group,
  )
  const sameLine = sameGroup.filter((other) => other.categoryId === product.categoryId)
  const otherLines = sameGroup.filter((other) => other.categoryId !== product.categoryId)
  return [...sameLine, ...otherLines].slice(0, limit)
}
