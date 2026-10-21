import type { ApiClient } from '../client'
import type { FeaturedReview, ReviewPage } from '../generated/schema'
import { unwrap } from '../unwrap'
import { assertPage, assertSlug } from './validation'

/**
 * Lista una página de reseñas aprobadas de un producto, con sus estadísticas.
 *
 * @param api - Cliente de la API.
 * @param slug - Slug del producto.
 * @param page - Número de página, empezando en 1; sin él, la primera.
 * @throws {RangeError} Si el slug está vacío o no cumple el patrón del contrato (ver `assertSlug`), o si
 *   la página no es un entero mayor o igual a 1.
 * @throws {ApiError} Si la llamada falla (`not_found` si el producto no existe).
 */
export async function listProductReviews(
  api: ApiClient,
  slug: string,
  page?: number,
): Promise<ReviewPage> {
  assertSlug(slug)
  if (page !== undefined) assertPage(page)
  return unwrap(
    api.GET('/products/{slug}/reviews', { params: { path: { slug }, query: { page } } }),
  )
}

/**
 * Lista las reseñas destacadas para el inicio.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function listFeaturedReviews(api: ApiClient): Promise<FeaturedReview[]> {
  return unwrap(api.GET('/reviews/featured'))
}
