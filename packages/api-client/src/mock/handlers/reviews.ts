import { averageRating, ratingDistribution } from '@galpon/domain'
import { reviewSchema } from '@galpon/schemas'
import type { FeaturedReview } from '../../generated/schema'
import type { MockRoute } from '../router'
import { json, notFound } from '../http'
import { approvedReviews, findBySlug, publishedProducts, toReview } from '../mappers'
import { route } from '../router'
import { randomUuid } from '../uuid'
import { QueryReader, slugParam } from '../validation'
import { readPublicForm } from './forms'

/** Reseñas por página en la ficha del producto. */
export const REVIEWS_PAGE_SIZE = 10

/** Rutas públicas de reseñas: las de un producto, las destacadas del inicio y enviar una nueva. */
export const reviewsRoutes: readonly MockRoute[] = [
  route('GET', '/products/{slug}/reviews', ({ db, params, query }) => {
    const slug = slugParam(params)
    const reader = new QueryReader(query)
    const page = reader.integer('page', 'La página', { min: 1 }, 1)
    reader.assertValid()
    const product = findBySlug(publishedProducts(db), slug)
    if (product === undefined) return notFound('No existe un producto con ese slug.')

    const reviews = approvedReviews(db, product.id)
    const ratings = reviews.map((review) => review.rating)
    const start = (page - 1) * REVIEWS_PAGE_SIZE
    return json({
      items: reviews.slice(start, start + REVIEWS_PAGE_SIZE).map(toReview),
      page,
      pageSize: REVIEWS_PAGE_SIZE,
      total: reviews.length,
      stats: {
        average: averageRating(ratings),
        count: ratings.length,
        distribution: ratingDistribution(ratings).map((bucket) => ({ ...bucket })),
      },
    })
  }),

  route('POST', '/products/{slug}/reviews', async (ctx) => {
    const slug = slugParam(ctx.params)
    const product = findBySlug(publishedProducts(ctx.db), slug)
    if (product === undefined) return notFound('No existe un producto con ese slug.')

    const form = await readPublicForm(ctx, reviewSchema)
    // La reseña queda pendiente: no se muestra ni cuenta hasta que el admin la apruebe, y nunca
    // es "compra verificada" porque el visitante no demostró haber comprado.
    if (!form.trapped) {
      ctx.db.reviews.push({
        id: `rev-${randomUuid()}`,
        productId: product.id,
        authorName: form.data.authorName,
        rating: form.data.rating,
        text: form.data.text,
        createdAt: ctx.now.toISOString(),
        status: 'pending',
        featured: false,
        verifiedPurchase: false,
      })
    }
    return json({ status: 'pending' }, 202)
  }),

  route('GET', '/reviews/featured', ({ db }) => {
    const featured: FeaturedReview[] = []
    for (const product of publishedProducts(db)) {
      for (const review of approvedReviews(db, product.id)) {
        if (review.featured) {
          featured.push({
            ...toReview(review),
            product: { name: product.name, slug: product.slug },
          })
        }
      }
    }
    return json(featured.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
  }),
]
