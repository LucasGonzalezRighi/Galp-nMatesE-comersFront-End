import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type {
  ProductDetail,
  ProductSummary,
  ProductTabsContent,
  ReviewPage,
} from '@galpon/api-client'
import {
  getProduct,
  getProductTabsContent,
  isApiError,
  listAllProducts,
  listProductReviews,
  listRelatedProducts,
} from '@galpon/api-client'
import { getServerApi } from '../../lib/api.server'

/** Largo máximo de un slug (el del contrato): también el de las etiquetas de caché `product:{slug}`. */
const SLUG_MAX_LENGTH = 80

/** Forma de un slug del contrato: minúsculas y números separados por guiones sueltos. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Indica si el texto tiene la forma de un slug de producto. Se usa antes de leer, para que un
 * texto cualquiera de la URL (mayúsculas, `..`, `%`) no llegue a la API ni arme una etiqueta de
 * caché; la validación definitiva es la de `getProduct`.
 */
function isSlugShaped(slug: string): boolean {
  return slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug)
}

/**
 * Slugs de todos los productos publicados, para que Next arme una página estática por producto
 * (`generateStaticParams`). Cacheada por horas y con la etiqueta `products`.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function listProductSlugs(): Promise<string[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('products')
  const products = await listAllProducts(getServerApi())
  return products.map((product) => product.slug)
}

/** Lee la ficha de un producto con un slug que ya tiene la forma correcta. */
async function readProduct(slug: string): Promise<ProductDetail | null> {
  'use cache'
  cacheLife('hours')
  cacheTag('products', `product:${slug}`)
  try {
    return await getProduct(getServerApi(), slug)
  } catch (error) {
    // Un slug que `getProduct` rechaza (RangeError) o que no existe no es un error de la tienda.
    if (error instanceof RangeError || (isApiError(error) && error.kind === 'not_found')) {
      return null
    }
    throw error
  }
}

/**
 * Ficha de un producto, o `null` si el slug no es válido (mayúsculas, `..`, `%`…) o no existe, así
 * la página responde `notFound()` y no un error 500. Con un slug anterior devuelve la ficha con su
 * slug actual: quien la usa compara y redirige. Cacheada por horas con las etiquetas `products` y
 * `product:{slug}`.
 *
 * @param slug - Lo que vino en la URL, sin confiar en su forma.
 * @throws {ApiError} Si la API falla por otra causa que "no existe".
 */
export async function findProduct(slug: string): Promise<ProductDetail | null> {
  if (!isSlugShaped(slug)) return null
  return await readProduct(slug)
}

/**
 * Hasta cuatro productos relacionados con uno. Cacheada por horas con las etiquetas `products` y
 * `product:{slug}`.
 *
 * @param slug - Slug actual de un producto que existe.
 * @throws {RangeError} Si el slug no es válido.
 * @throws {ApiError} Si la API falla.
 */
export async function getRelatedProducts(slug: string): Promise<ProductSummary[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('products', `product:${slug}`)
  return await listRelatedProducts(getServerApi(), slug)
}

/**
 * Primera página de reseñas aprobadas de un producto, con las estadísticas de todas. Cacheada por
 * horas con la etiqueta `reviews:{slug}`, que el backend regenera al aprobar una reseña.
 *
 * @param slug - Slug actual de un producto que existe.
 * @throws {RangeError} Si el slug no es válido.
 * @throws {ApiError} Si la API falla.
 */
export async function getProductReviews(slug: string): Promise<ReviewPage> {
  'use cache'
  cacheLife('hours')
  cacheTag(`reviews:${slug}`)
  return await listProductReviews(getServerApi(), slug)
}

/**
 * Textos de las pestañas de la ficha por grupo (de ahí salen los títulos "Materiales" o
 * "Contenido", "Cuidado" o "Conservación"). Cacheada por horas con la etiqueta
 * `content:product-tabs`.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getTabsContent(): Promise<ProductTabsContent> {
  'use cache'
  cacheLife('hours')
  cacheTag('content:product-tabs')
  return await getProductTabsContent(getServerApi())
}
