import type { ProductSummary } from '@galpon/api-client'
import type { ProductSortOrder } from '@galpon/domain'
import { isProductSortOrder, matchesSearch, pesos, sortProducts } from '@galpon/domain'

/** Orden con el que se abre el catálogo y que no hace falta escribir en la dirección. */
export const DEFAULT_CATALOG_ORDER: ProductSortOrder = 'destacados'

/** Lo que la persona eligió en el catálogo: el texto buscado y el orden. */
export interface CatalogParams {
  /** Texto buscado, tal como se escribió (puede tener espacios sobrantes). Vacío si no busca. */
  query: string
  /** Orden del listado. */
  order: ProductSortOrder
}

/**
 * Lee la búsqueda y el orden de los parámetros `?q=&orden=` de la dirección.
 *
 * Nunca falla: un orden que no existe (`?orden=baratos`) vuelve al de por omisión y la búsqueda
 * se deja como llegó, porque lo único que se hace con ella es compararla como texto.
 *
 * @param q - Valor de `q`, o `null` si no vino.
 * @param orden - Valor de `orden`, o `null` si no vino.
 */
export function readCatalogParams(q: string | null, orden: string | null): CatalogParams {
  return {
    query: q ?? '',
    order: orden !== null && isProductSortOrder(orden) ? orden : DEFAULT_CATALOG_ORDER,
  }
}

/**
 * Arma la parte `?q=&orden=` de la dirección del catálogo. Solo incluye lo que no es el valor por
 * omisión (búsqueda no vacía, orden distinto de destacados) y codifica el texto.
 *
 * @param params - Búsqueda y orden.
 * @returns El texto con `?` adelante, o una cadena vacía si no hay nada que escribir.
 * @example
 * catalogSearch({ query: 'té', order: 'az' }) // "?q=t%C3%A9&orden=az"
 */
export function catalogSearch(params: CatalogParams): string {
  const search = new URLSearchParams()
  const query = params.query.trim()
  if (query !== '') search.set('q', query)
  if (params.order !== DEFAULT_CATALOG_ORDER) search.set('orden', params.order)
  const text = search.toString()
  return text === '' ? '' : `?${text}`
}

/**
 * Filtra el catálogo con la búsqueda y lo ordena, sin tocar la lista original.
 *
 * La búsqueda no distingue acentos ni mayúsculas y mira el nombre, la descripción y la línea
 * (`matchesSearch` de `@galpon/domain`); el orden es el de `sortProducts` (los productos "a
 * consultar" quedan al final en "Menor precio" y "Mayor precio").
 *
 * @param products - Productos a mostrar.
 * @param params - Búsqueda y orden.
 * @throws {RangeError} Si el orden no es uno de los del catálogo o un precio no es un entero.
 */
export function filterCatalog(
  products: readonly ProductSummary[],
  params: CatalogParams,
): ProductSummary[] {
  if (!isProductSortOrder(params.order)) {
    throw new RangeError(`El orden del catálogo no es válido: ${JSON.stringify(params.order)}.`)
  }
  const found = products.filter((product) =>
    matchesSearch(params.query, [product.name, product.description, product.categoryName]),
  )
  // `sortProducts` pide montos tipados `Pesos`; `pesos` valida que sean enteros.
  const rows = found.map((product) => ({
    product,
    name: product.name,
    featured: product.featured,
    priceArs: product.priceArs === null ? null : pesos(product.priceArs),
  }))
  return sortProducts(rows, params.order).map((row) => row.product)
}

/** Formato de los números con miles al estilo argentino ("1.234"). */
const COUNT_FORMAT = new Intl.NumberFormat('es-AR')

/**
 * Texto del contador del catálogo: "1 pieza", "27 piezas".
 *
 * @param count - Cantidad de productos que se ven.
 * @throws {RangeError} Si no es un entero mayor o igual a 0.
 */
export function catalogCountLabel(count: number): string {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(
      `La cantidad de piezas tiene que ser un entero mayor o igual a 0; se recibió ${String(count)}.`,
    )
  }
  return `${COUNT_FORMAT.format(count)} ${count === 1 ? 'pieza' : 'piezas'}`
}
