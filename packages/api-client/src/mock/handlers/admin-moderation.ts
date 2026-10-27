import { adminReviewUpdateSchema, messageUpdateSchema } from '@galpon/schemas'
import type {
  AdminReview,
  ContactMessage,
  ContactMessageKind,
  ReviewStatus,
} from '../../generated/schema'
import type { MockContext, MockRoute } from '../router'
import type { MockDb, MockMessage, MockReview } from '../types'
import { json, notFound, ResponseError } from '../http'
import { toReview } from '../mappers'
import { route } from '../router'
import { parseOrFail, QueryReader } from '../validation'
import { requireAdmin } from './admin-auth'

/** Reseñas o mensajes por página en el dashboard. */
export const ADMIN_MODERATION_PAGE_SIZE = 20

/** Estados de moderación de una reseña (`ReviewStatus` del contrato). */
const REVIEW_STATUSES = ['pending', 'approved', 'hidden'] as const satisfies readonly ReviewStatus[]

/** Tipos de mensaje de la bandeja (`ContactMessageKind` del contrato). */
const MESSAGE_KINDS = ['contact', 'withdrawal'] as const satisfies readonly ContactMessageKind[]

/** Lo más nuevo primero, por `createdAt`. */
function newestFirst<T extends { createdAt: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

/** Una página de una lista ya filtrada y ordenada. */
function pageOf<T>(items: readonly T[], page: number) {
  const start = (page - 1) * ADMIN_MODERATION_PAGE_SIZE
  return {
    items: items.slice(start, start + ADMIN_MODERATION_PAGE_SIZE),
    page,
    pageSize: ADMIN_MODERATION_PAGE_SIZE,
    total: items.length,
  }
}

/**
 * Arma la reseña como la ve el dashboard, con el slug actual y el nombre de su producto.
 *
 * @returns La reseña, o `undefined` si su producto ya no existe.
 */
function toAdminReview(review: MockReview, db: MockDb): AdminReview | undefined {
  const product = db.products.find((candidate) => candidate.id === review.productId)
  if (product === undefined) return undefined
  return {
    ...toReview(review),
    status: review.status,
    featured: review.featured,
    product: { slug: product.slug, name: product.name },
  }
}

/** Arma el mensaje como lo devuelve la API (una copia, para no exponer el de la base). */
function toContactMessage(message: MockMessage): ContactMessage {
  return { ...message }
}

/** Busca la reseña de la ruta (`{id}`) con su producto. */
function findReview(ctx: MockContext): { review: MockReview; adminReview: AdminReview } {
  const review = ctx.db.reviews.find((candidate) => candidate.id === ctx.params.id)
  const adminReview = review === undefined ? undefined : toAdminReview(review, ctx.db)
  if (review === undefined || adminReview === undefined) {
    throw new ResponseError(notFound('No existe esa reseña.'))
  }
  return { review, adminReview }
}

/**
 * Rutas del dashboard para moderar: reseñas (listado y aprobar, ocultar o destacar) y la bandeja de
 * mensajes (listado y marcar leído o no leído).
 *
 * Los listados van de lo más nuevo a lo más viejo, de a 20. Moderar una reseña invalida las
 * destacadas del inicio (`reviews:featured`) y la ficha de su producto (`product:{slug}`).
 */
export const adminModerationRoutes: readonly MockRoute[] = [
  route('GET', '/admin/reviews', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    const reader = new QueryReader(ctx.query)
    const page = reader.integer('page', 'La página', { min: 1 }, 1)
    const status = reader.oneOf('status', 'El estado', REVIEW_STATUSES)
    reader.assertValid()
    const reviews = newestFirst(ctx.db.reviews)
      .filter((review) => status === undefined || review.status === status)
      .flatMap((review) => toAdminReview(review, ctx.db) ?? [])
    return json(pageOf(reviews, page))
  }),

  route('PATCH', '/admin/reviews/{id}', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const body = await ctx.body()
    const { review, adminReview } = findReview(ctx)
    const update = parseOrFail(adminReviewUpdateSchema, body)
    if (update.status !== undefined) review.status = update.status
    if (update.featured !== undefined) review.featured = update.featured
    ctx.invalidate(['reviews:featured', `product:${adminReview.product.slug}`])
    return json({ ...adminReview, status: review.status, featured: review.featured })
  }),

  route('GET', '/admin/messages', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    const reader = new QueryReader(ctx.query)
    const page = reader.integer('page', 'La página', { min: 1 }, 1)
    const kind = reader.oneOf('kind', 'El tipo de mensaje', MESSAGE_KINDS)
    const read = reader.boolean('read')
    reader.assertValid()
    const messages = newestFirst(ctx.db.messages).filter(
      (message) =>
        (kind === undefined || message.kind === kind) &&
        (read === undefined || message.read === read),
    )
    return json(pageOf(messages.map(toContactMessage), page))
  }),

  route('PATCH', '/admin/messages/{id}', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const body = await ctx.body()
    const message = ctx.db.messages.find((candidate) => candidate.id === ctx.params.id)
    if (message === undefined) throw new ResponseError(notFound('No existe ese mensaje.'))
    message.read = parseOrFail(messageUpdateSchema, body).read
    return json(toContactMessage(message))
  }),
]
