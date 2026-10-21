import {
  formatProductCode,
  matchesSearch,
  PRODUCT_SORT_ORDERS,
  PRODUCT_STATUSES,
} from '@galpon/domain'
import type { MockRoute } from '../router'
import { json } from '../http'
import { sortMockProducts, toAdminProduct } from '../mappers'
import { route } from '../router'
import { QueryReader } from '../validation'
import { requireAdmin } from './admin-auth'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './catalog'

/** Rutas del dashboard para productos (por ahora, solo el listado). */
export const adminProductsRoutes: readonly MockRoute[] = [
  route('GET', '/admin/products', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    const { db, query } = ctx
    const reader = new QueryReader(query)
    const page = reader.integer('page', 'La página', { min: 1 }, 1)
    const pageSize = reader.integer(
      'pageSize',
      'El tamaño de página',
      { min: 1, max: MAX_PAGE_SIZE },
      DEFAULT_PAGE_SIZE,
    )
    const status = reader.oneOf('status', 'El estado', PRODUCT_STATUSES)
    const stock = reader.oneOf('stock', 'El stock', ['out'])
    const sort = reader.oneOf('sort', 'El orden', PRODUCT_SORT_ORDERS)
    const categorySlug = reader.slug('category')
    const search = reader.text('q', 100)
    reader.assertValid()

    const category =
      categorySlug === undefined
        ? undefined
        : db.categories.find((candidate) => candidate.slug === categorySlug)
    const matching = [...db.products]
      .sort((a, b) => a.sequence - b.sequence)
      .filter((product) => {
        // Sin filtro de estado, el listado trae borradores y publicados pero no archivados.
        if (status === undefined ? product.status === 'archived' : product.status !== status) {
          return false
        }
        if (stock === 'out' && product.stock !== 0) return false
        if (categorySlug !== undefined && category?.id !== product.categoryId) return false
        return (
          search === undefined ||
          matchesSearch(search, [product.name, formatProductCode(product.sequence)])
        )
      })
    const sorted = sort === undefined ? matching : sortMockProducts(matching, sort)
    const start = (page - 1) * pageSize
    return json({
      items: sorted.slice(start, start + pageSize).map((product) => toAdminProduct(product, db)),
      page,
      pageSize,
      total: sorted.length,
    })
  }),
]
