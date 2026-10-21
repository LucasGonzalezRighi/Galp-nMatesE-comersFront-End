import type { ApiClient } from '../client'
import type { FeaturedReview, ReviewInput, ReviewPage, ReviewReceipt } from '../generated/schema'
import { unwrap } from '../unwrap'
import { assertPage, assertSlug } from './validation'

/**
 * Reseña como la arma el formulario: el nombre y el campo trampa pueden faltar (el contrato los
 * pide, con `null` cuando no corresponden).
 */
export interface ReviewSubmission extends Omit<ReviewInput, 'authorName' | 'website'> {
  /** Nombre con el que firma; sin él (o `null`), el back firma como "Anónimo". */
  authorName?: ReviewInput['authorName']
  /** Campo trampa contra bots: las personas lo dejan vacío. */
  website?: ReviewInput['website']
}

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

/**
 * Envía la reseña de un producto. No se publica enseguida: queda pendiente hasta que el
 * administrador la aprueba.
 *
 * @param api - Cliente de la API.
 * @param slug - Slug del producto.
 * @param input - Datos del formulario; lo que falte entre lo opcional viaja como `null`.
 * @returns La confirmación, con el estado `pending`.
 * @throws {RangeError} Si el slug está vacío o no cumple el patrón del contrato (ver `assertSlug`).
 * @throws {ApiError} Si la llamada falla (`not_found` si el producto no existe, `validation` con el
 *   mensaje de cada campo si los datos no son válidos, `rate_limited` si hubo demasiados envíos).
 */
export async function createReview(
  api: ApiClient,
  slug: string,
  input: ReviewSubmission,
): Promise<ReviewReceipt> {
  assertSlug(slug)
  return unwrap(
    api.POST('/products/{slug}/reviews', {
      params: { path: { slug } },
      body: {
        rating: input.rating,
        authorName: input.authorName ?? null,
        text: input.text,
        website: input.website ?? null,
      },
    }),
  )
}
