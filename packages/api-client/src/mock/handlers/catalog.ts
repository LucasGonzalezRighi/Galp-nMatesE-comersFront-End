import { matchesSearch, PRODUCT_GROUPS, PRODUCT_SORT_ORDERS, selectRelated } from '@galpon/domain'
import type { MockRoute } from '../router'
import { json, notFound } from '../http'
import {
  findBySlug,
  publishedProducts,
  sortMockProducts,
  toCategory,
  toProductDetail,
  toProductSummary,
} from '../mappers'
import { route } from '../router'
import { QueryReader, slugParam } from '../validation'

/** Productos por página si el pedido no dice otra cosa. */
export const DEFAULT_PAGE_SIZE = 24

/** Máximo de productos por página del contrato. */
export const MAX_PAGE_SIZE = 100

/** Productos relacionados que devuelve la ficha. */
const RELATED_LIMIT = 4

/** Rutas públicas del catálogo: líneas, listado, ficha y relacionados. */
export const catalogRoutes: readonly MockRoute[] = [
  route('GET', '/categories', ({ db }) =>
    json(
      [...db.categories]
        .sort((a, b) => a.position - b.position)
        .map((category) => toCategory(category, db)),
    ),
  ),

  route('GET', '/products', ({ db, query }) => {
    const reader = new QueryReader(query)
    const page = reader.integer('page', 'La página', { min: 1 }, 1)
    const pageSize = reader.integer(
      'pageSize',
      'El tamaño de página',
      { min: 1, max: MAX_PAGE_SIZE },
      DEFAULT_PAGE_SIZE,
    )
    const group = reader.oneOf('group', 'El grupo', PRODUCT_GROUPS)
    const featured = reader.boolean('featured')
    const sort = reader.oneOf('sort', 'El orden', PRODUCT_SORT_ORDERS) ?? 'destacados'
    const categorySlug = reader.slug('category')
    const ids = reader.text('ids', 4000)
    const search = reader.text('q', 100)
    reader.assertValid()

    const category =
      categorySlug === undefined
        ? undefined
        : db.categories.find((candidate) => candidate.slug === categorySlug)
    const wantedIds =
      ids === undefined
        ? undefined
        : new Set(
            ids
              .split(',')
              .map((id) => id.trim())
              .filter((id) => id !== ''),
          )
    const matching = publishedProducts(db).filter((product) => {
      const line = db.categories.find((candidate) => candidate.id === product.categoryId)
      if (categorySlug !== undefined && category?.id !== product.categoryId) return false
      if (group !== undefined && line?.group !== group) return false
      if (wantedIds !== undefined && !wantedIds.has(product.id)) return false
      if (featured === true && !product.featured) return false
      return (
        search === undefined ||
        matchesSearch(search, [product.name, product.description, line?.name ?? ''])
      )
    })
    const sorted = sortMockProducts(matching, sort)
    const start = (page - 1) * pageSize
    return json({
      items: sorted.slice(start, start + pageSize).map((product) => toProductSummary(product, db)),
      page,
      pageSize,
      total: sorted.length,
    })
  }),

  route('GET', '/products/{slug}', ({ db, params }) => {
    const product = findBySlug(publishedProducts(db), slugParam(params))
    return product === undefined
      ? notFound('No existe un producto con ese slug.')
      : json(toProductDetail(product, db))
  }),

  route('GET', '/products/{slug}/related', ({ db, params }) => {
    const published = publishedProducts(db)
    const product = findBySlug(published, slugParam(params))
    if (product === undefined) return notFound('No existe un producto con ese slug.')
    const summaries = published.map((candidate) => toProductSummary(candidate, db))
    const current = summaries.find((summary) => summary.id === product.id)
    return json(current === undefined ? [] : selectRelated(current, summaries, RELATED_LIMIT))
  }),
]
