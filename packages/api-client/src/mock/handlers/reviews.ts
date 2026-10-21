import { averageRating, ratingDistribution } from '@galpon/domain'
import type { FeaturedReview } from '../../generated/schema'
import type { MockRoute } from '../router'
import { json, notFound } from '../http'
import { approvedReviews, findBySlug, publishedProducts, toReview } from '../mappers'
import { route } from '../router'
import { QueryReader, slugParam } from '../validation'

/** Reseñas por página en la ficha del producto. */
export const REVIEWS_PAGE_SIZE = 10

/** Rutas públicas de reseñas: las de un producto y las destacadas del inicio. */
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
