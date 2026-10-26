import { matchesSearch, normalizeSearchText } from '@galpon/domain'

/** Máximo de resultados que muestra el buscador (spec 9.5). */
export const MAX_SEARCH_RESULTS = 6

/** Lo que usa el buscador de un producto: los textos donde busca (spec 8) y a dónde lleva. */
export interface SearchableProduct {
  /** Slug, para armar la ruta de la ficha. */
  slug: string
  /** Nombre del producto. */
  name: string
  /** Descripción del producto. */
  description: string
  /** Nombre de la línea. */
  categoryName: string
}

/**
 * Productos que coinciden con la búsqueda, en el orden del catálogo. Busca sobre nombre,
 * descripción y línea, sin acentos ni mayúsculas (`matchesSearch` de `@galpon/domain`). Una
 * búsqueda vacía o de solo espacios no encuentra nada.
 *
 * @param products - Catálogo publicado.
 * @param query - Lo que escribió la persona.
 * @returns Todos los que coinciden (el buscador muestra los primeros {@link MAX_SEARCH_RESULTS}).
 */
export function matchProducts<T extends SearchableProduct>(
  products: readonly T[],
  query: string,
): T[] {
  if (normalizeSearchText(query) === '') return []
  return products.filter((product) =>
    matchesSearch(query, [product.name, product.description, product.categoryName]),
  )
}

/**
 * Ruta de la tienda con una búsqueda: `/tienda?q=` con el texto codificado (un `<script>` o un
 * emoji viajan como `%3C…`), o `/tienda` si no hay texto.
 *
 * @param query - Lo que escribió la persona.
 * @returns La ruta, empezando con `/`.
 */
export function shopSearchHref(query: string): string {
  const text = query.trim()
  return text === '' ? '/tienda' : `/tienda?q=${encodeURIComponent(text)}`
}

/**
 * Ruta de la ficha de un producto.
 *
 * @param slug - Slug del producto.
 * @returns `/producto/{slug}`, con el slug codificado.
 */
export function productHref(slug: string): string {
  return `/producto/${encodeURIComponent(slug)}`
}

/**
 * Ruta de una línea de la tienda.
 *
 * @param slug - Slug de la línea.
 * @returns `/tienda/{slug}`, con el slug codificado.
 */
export function lineHref(slug: string): string {
  return `/tienda/${encodeURIComponent(slug)}`
}

/**
 * A dónde lleva Enter (spec 9.5): a la ficha si la búsqueda tiene un solo resultado y a la tienda
 * con la búsqueda si tiene ninguno o varios.
 *
 * @param matches - Todos los productos que coinciden con la búsqueda.
 * @param query - Lo que escribió la persona.
 * @returns La ruta de destino.
 */
export function enterHref(matches: readonly SearchableProduct[], query: string): string {
  const [only, ...others] = matches
  return only !== undefined && others.length === 0 ? productHref(only.slug) : shopSearchHref(query)
}
