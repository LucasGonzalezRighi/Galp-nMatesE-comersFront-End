import type { Category, ProductSummary } from '@galpon/api-client'
import type { CatalogParams } from './catalog-query'
import { catalogSearch } from './catalog-query'

/**
 * Línea de relleno de `generateStaticParams` cuando todavía no hay líneas. Los slugs de verdad
 * solo llevan minúsculas, números y guiones, así que ningún slug real la iguala y la página
 * responde `notFound()`.
 */
export const CATALOG_PLACEHOLDER_LINE = '_'

/** Un botón de línea del catálogo: su slug, su nombre y cuántas piezas tiene. */
export interface CatalogLine {
  /** Slug de la línea, para la dirección `/tienda/{slug}`. */
  slug: string
  /** Nombre de la línea. */
  name: string
  /** Cantidad de productos publicados de la línea. */
  count: number
}

/** La línea que se está viendo: lo que lleva el título y la bajada. */
export interface ActiveCatalogLine {
  /** Slug de la línea. */
  slug: string
  /** Nombre, que es el título de la página. */
  name: string
  /** Descripción corta, que es la bajada. */
  blurb: string
}

/** Todo lo que el catálogo necesita saber de qué mostrar, ya resuelto en el servidor. */
export interface CatalogScope {
  /** La línea que se ve, o `null` para todo el catálogo. */
  line: ActiveCatalogLine | null
  /** Las líneas, en el orden del listado, para los botones. */
  lines: CatalogLine[]
  /** Cantidad de productos de todo el catálogo (el número del botón "Todos"). */
  totalCount: number
  /** Los productos que se pueden mostrar: los de la línea o, sin línea, todos. */
  products: ProductSummary[]
}

/**
 * Resuelve qué muestra la página del catálogo: todo o una línea.
 *
 * Las cantidades de los botones se cuentan de los mismos productos que se dibujan, así el número
 * y la grilla siempre coinciden.
 *
 * @param categories - Líneas, en el orden del listado.
 * @param products - Catálogo publicado completo.
 * @param lineSlug - Slug de la dirección (`/tienda/{slug}`), o `null` para todo el catálogo.
 * @returns El alcance, o `null` si `lineSlug` no es una línea (la página responde `notFound()`).
 *   Cualquier texto raro (mayúsculas, `..`, `%`) simplemente no coincide.
 */
export function buildCatalogScope(
  categories: readonly Category[],
  products: readonly ProductSummary[],
  lineSlug: string | null,
): CatalogScope | null {
  const active = lineSlug === null ? undefined : categories.find((item) => item.slug === lineSlug)
  if (lineSlug !== null && active === undefined) return null
  return {
    line:
      active === undefined ? null : { slug: active.slug, name: active.name, blurb: active.blurb },
    lines: categories.map((item) => ({
      slug: item.slug,
      name: item.name,
      count: products.filter((product) => product.categoryId === item.id).length,
    })),
    totalCount: products.length,
    products:
      active === undefined
        ? [...products]
        : products.filter((product) => product.categoryId === active.id),
  }
}

/**
 * Parámetros de `generateStaticParams` de `/tienda/[linea]`: uno por línea. Con Cache Components
 * tiene que haber al menos uno, así que si no hay líneas devuelve el de relleno
 * ({@link CATALOG_PLACEHOLDER_LINE}), que la página resuelve con `notFound()`.
 *
 * @param categories - Líneas del catálogo.
 */
export function catalogLineParams(categories: readonly Category[]): { linea: string }[] {
  if (categories.length === 0) return [{ linea: CATALOG_PLACEHOLDER_LINE }]
  return categories.map((item) => ({ linea: item.slug }))
}

/**
 * Dirección del catálogo de una línea (o de todo) conservando la búsqueda y el orden, como en el
 * diseño, donde cambiar de línea no borra lo que se escribió.
 *
 * @param lineSlug - Slug de la línea, o `null` para todo el catálogo.
 * @param params - Búsqueda y orden a conservar.
 * @example
 * catalogHref('torpedos', { query: '', order: 'az' }) // "/tienda/torpedos?orden=az"
 */
export function catalogHref(lineSlug: string | null, params: CatalogParams): string {
  const base = lineSlug === null ? '/tienda' : `/tienda/${encodeURIComponent(lineSlug)}`
  return `${base}${catalogSearch(params)}`
}
