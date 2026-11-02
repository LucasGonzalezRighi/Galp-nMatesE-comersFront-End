import type {
  Category,
  FeaturedReview,
  HomeContent,
  ProductSummary,
  PublicSettings,
} from '@galpon/api-client'
import type { ProductGroup } from '@galpon/domain'
import { formatDiscountPercent } from '@galpon/domain'
import type { HomeStats } from './home-stats'
import type { StoryProducts } from './story-products'
import { computeHomeStats } from './home-stats'
import { resolveStoryProducts } from './story-products'

/** Cuántos destacados se muestran: dos filas de cuatro en escritorio. */
export const FEATURED_LIMIT = 8

/** Cuántas reseñas destacadas entran en el carrusel del cierre. */
export const REVIEWS_LIMIT = 6

/** Lo que el servidor lee de la API para armar el inicio. */
export interface HomeInput {
  /** Textos editables del inicio. */
  content: HomeContent
  /** Productos publicados, en el orden del listado (los destacados primero). */
  products: readonly ProductSummary[]
  /** Líneas de producto. */
  categories: readonly Category[]
  /** Ajustes públicos de la tienda. */
  settings: PublicSettings
  /** Reseñas destacadas, de la más nueva a la más vieja. */
  reviews: readonly FeaturedReview[]
}

/** Todo lo que necesitan las secciones del inicio, ya resuelto. */
export interface HomeData {
  /** Textos editables del inicio. */
  content: HomeContent
  /** Ajustes públicos (cuotas y precio sin impuestos de las tarjetas). */
  settings: PublicSettings
  /** Líneas con piezas publicadas, en el orden del listado. */
  lines: Category[]
  /** Productos destacados que muestra la grilla. */
  featured: ProductSummary[]
  /** Reseñas destacadas que muestra el cierre. */
  reviews: FeaturedReview[]
  /** Productos de las escenas de la historia, con respaldo si alguno no se puede comprar. */
  story: StoryProducts
  /** Cifras del catálogo. */
  stats: HomeStats
  /** Descuento del kit para mostrar ("−10%"), o `null` si el kit no tiene descuento. */
  kitDiscountLabel: string | null
}

/**
 * Arma los datos del inicio a partir de lo que devuelve la API: filtra y ordena las líneas,
 * recorta los destacados y las reseñas, resuelve los productos de la historia y calcula las
 * cifras y el descuento del kit. No recalcula precios ni stock: usa lo que informa la API.
 *
 * @param input - Ver {@link HomeInput}.
 * @returns Ver {@link HomeData}.
 * @throws {RangeError} Si el descuento del kit o la cantidad de productos de una línea no son válidos.
 */
export function buildHomeData(input: HomeInput): HomeData {
  const { content, products, categories, settings, reviews } = input
  const discount = settings.kitDiscountPercent
  return {
    content,
    settings,
    lines: categories
      .filter((category) => category.productCount > 0)
      .toSorted((a, b) => a.position - b.position),
    featured: products.filter((product) => product.featured).slice(0, FEATURED_LIMIT),
    reviews: reviews.slice(0, REVIEWS_LIMIT),
    story: resolveStoryProducts(content.storyProducts, products),
    stats: computeHomeStats(products, categories),
    kitDiscountLabel: discount > 0 ? formatDiscountPercent(discount) : null,
  }
}

/**
 * Ruta a la que lleva el botón de una escena: la primera línea del grupo o, si no hay ninguna con
 * piezas, la tienda completa.
 *
 * @param lines - Líneas con piezas publicadas, en el orden del listado.
 * @param group - Grupo de producto.
 * @returns Por ejemplo `/tienda/bombillones`, o `/tienda`.
 */
export function lineHref(lines: readonly Category[], group: ProductGroup): string {
  const line = lines.find((candidate) => candidate.group === group)
  return line === undefined ? '/tienda' : `/tienda/${encodeURIComponent(line.slug)}`
}
