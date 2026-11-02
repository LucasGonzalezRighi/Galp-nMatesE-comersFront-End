import type { SortDirection } from '@tanstack/react-table'
import { z } from 'zod'
import type { AdminProductQuery } from '@galpon/api-client'
import { PRODUCT_STATUSES } from '@galpon/domain'
import { slugSchema } from '@galpon/schemas'
import { PRODUCTS_PAGE_SIZE, PRODUCTS_SEARCH_MAX_LENGTH } from './products.constants'

/** Órdenes que ofrece la tabla: A-Z, menor precio y mayor precio (sin `orden`, por código). */
export const PRODUCT_LIST_ORDERS = ['az', 'menor', 'mayor'] as const

/** Un orden de la tabla de productos (`?orden=`). */
export type ProductListOrder = (typeof PRODUCT_LIST_ORDERS)[number]

/** Columnas de la tabla que se pueden ordenar. */
export type ProductSortColumn = 'name' | 'price'

/** Columna y sentido que marca un orden en la tabla. */
export interface ProductSorting {
  /** Columna ordenada. */
  columnId: ProductSortColumn
  /** Sentido del orden. */
  direction: SortDirection
}

/**
 * Parámetros de `/productos` en la URL: `?q=`, `?linea=` (slug de la línea), `?estado=`,
 * `?sinStock=1`, `?orden=` y `?pagina=`. Lo que no sirve se descarta (`.catch`) en lugar de
 * romper la pantalla; un texto que parece número (`?q=7`) sigue siendo texto.
 */
export const productsSearchSchema = z.object({
  q: z.coerce.string().trim().min(1).max(PRODUCTS_SEARCH_MAX_LENGTH).optional().catch(undefined),
  linea: slugSchema.optional().catch(undefined),
  estado: z.enum(PRODUCT_STATUSES).optional().catch(undefined),
  sinStock: z.literal(1).optional().catch(undefined),
  orden: z.enum(PRODUCT_LIST_ORDERS).optional().catch(undefined),
  pagina: z.number().int().min(1).optional().catch(undefined),
})

/** Filtros de `/productos` ya validados. */
export type ProductsSearch = z.output<typeof productsSearchSchema>

/**
 * Arma la consulta de `GET /admin/products` a partir de los filtros de la URL, de a 24.
 *
 * Sin `estado`, la API devuelve los publicados y los borradores; la página 1 no se manda.
 *
 * @param search - Filtros de la URL.
 * @returns La consulta, lista para `adminProductsQuery`.
 * @throws {RangeError} Si la página no es un entero mayor a 0 o el texto pasa de 100 caracteres.
 * @example
 * toAdminProductQuery({ sinStock: 1, orden: 'az' }) // { stock: 'out', sort: 'az', pageSize: 24 }
 */
export function toAdminProductQuery(search: ProductsSearch): AdminProductQuery {
  const { q, linea, estado, sinStock, orden, pagina } = search
  if (pagina !== undefined && (!Number.isInteger(pagina) || pagina < 1)) {
    throw new RangeError(
      `La página tiene que ser un entero mayor a 0; se recibió ${String(pagina)}.`,
    )
  }
  if (q !== undefined && q.length > PRODUCTS_SEARCH_MAX_LENGTH) {
    throw new RangeError(
      `La búsqueda admite hasta ${String(PRODUCTS_SEARCH_MAX_LENGTH)} caracteres; se recibieron ${String(q.length)}.`,
    )
  }
  const query: AdminProductQuery = {}
  if (q !== undefined && q.trim() !== '') query.q = q.trim()
  if (linea !== undefined) query.category = linea
  if (estado !== undefined) query.status = estado
  if (sinStock === 1) query.stock = 'out'
  if (orden !== undefined) query.sort = orden
  if (pagina !== undefined && pagina > 1) query.page = pagina
  query.pageSize = PRODUCTS_PAGE_SIZE
  return query
}

/**
 * Indica si la lista está filtrada (texto, línea, estado o sin stock); el orden y la página no
 * cuentan.
 *
 * @param search - Filtros de la URL.
 * @returns `true` si algún filtro está puesto.
 */
export function hasProductFilters(search: ProductsSearch): boolean {
  return (
    search.q !== undefined ||
    search.linea !== undefined ||
    search.estado !== undefined ||
    search.sinStock !== undefined
  )
}

/** Columna y sentido de cada orden de la URL. */
const SORTING_OF_ORDER: Readonly<Record<ProductListOrder, ProductSorting>> = {
  az: { columnId: 'name', direction: 'asc' },
  menor: { columnId: 'price', direction: 'asc' },
  mayor: { columnId: 'price', direction: 'desc' },
}

/**
 * Columna marcada en la tabla según el orden de la URL.
 *
 * @param order - `?orden=`, o `undefined` (por código: ninguna columna marcada).
 * @returns La columna y el sentido, o `null` sin orden.
 */
export function sortingOfOrder(order: ProductListOrder | undefined): ProductSorting | null {
  return order === undefined ? null : SORTING_OF_ORDER[order]
}

/**
 * Orden de la URL al tocar el encabezado de una columna. El nombre solo se ordena de la A a la Z:
 * pedirlo al revés vuelve al orden por código.
 *
 * @param columnId - Columna tocada (`name` o `price`).
 * @param direction - Sentido pedido.
 * @returns El valor de `?orden=`, o `undefined` para el orden por código.
 * @throws {RangeError} Si la columna no se puede ordenar.
 */
export function orderOfSorting(
  columnId: string,
  direction: SortDirection,
): ProductListOrder | undefined {
  if (columnId === 'name') return direction === 'asc' ? 'az' : undefined
  if (columnId === 'price') return direction === 'asc' ? 'menor' : 'mayor'
  throw new RangeError(`La columna "${columnId}" no se puede ordenar.`)
}
