import { z } from 'zod'
import {
  formatProductCode,
  matchesSearch,
  PRODUCT_SORT_ORDERS,
  PRODUCT_STATUSES,
} from '@galpon/domain'
import { productFormSchema } from '@galpon/schemas'
import type { Image } from '../../generated/schema'
import type { MockContext, MockRoute } from '../router'
import type { MockDb, MockProduct } from '../types'
import { json, notFound, problem, ResponseError, validationProblem } from '../http'
import { resolveImage, sortMockProducts, toAdminProduct } from '../mappers'
import { route } from '../router'
import { randomUuid } from '../uuid'
import { parseOrFail, QueryReader, withoutNulls } from '../validation'
import { requireAdmin } from './admin-auth'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './catalog'

/** Cuerpo de `POST` y `PATCH`: las reglas del formulario más `expectedUpdatedAt` (solo `PATCH`). */
const productInputSchema = productFormSchema.extend({
  expectedUpdatedAt: z.iso
    .datetime({ offset: true, error: 'La fecha de la última modificación no es válida.' })
    .optional(),
})

/** Producto ya validado, como lo mandó el dashboard. */
type ProductInput = z.output<typeof productInputSchema>

/** Campos del producto que salen tal cual del formulario. */
type ProductFields = Pick<
  MockProduct,
  | 'categoryId'
  | 'name'
  | 'description'
  | 'priceArs'
  | 'stock'
  | 'featured'
  | 'status'
  | 'images'
  | 'tabsOverride'
>

/**
 * Error `409 slug_taken`: el slug ya lo usa otro producto u otra línea.
 *
 * @param slug - Slug pedido.
 */
export function slugTaken(slug: string): ResponseError {
  return new ResponseError(
    problem(409, 'El slug ya está en uso', {
      type: 'slug_taken',
      detail: `Ya hay algo con el slug ${slug}.`,
    }),
  )
}

/**
 * Prepara el cuerpo para `productFormSchema`: en el contrato `tabsOverride` y sus textos pueden
 * venir en `null` (usar los del grupo) y el schema espera que falten.
 */
function normalizeProductBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('tabsOverride' in body)) return body
  const { tabsOverride, ...rest } = body
  return tabsOverride === null ? rest : { ...rest, tabsOverride: withoutNulls(tabsOverride) }
}

/** Busca el producto de la ruta (`{id}`), en cualquier estado. */
function findProduct(ctx: MockContext): MockProduct {
  const product = ctx.db.products.find((candidate) => candidate.id === ctx.params.id)
  if (product === undefined) throw new ResponseError(notFound('No existe ese producto.'))
  return product
}

/** Textos propios de las pestañas como los guarda la base: `null` si no hay ninguno. */
function toTabsOverride(value: ProductInput['tabsOverride']): MockProduct['tabsOverride'] {
  if (value?.materials === undefined && value?.care === undefined) return null
  return {
    ...(value.materials === undefined ? {} : { materials: value.materials }),
    ...(value.care === undefined ? {} : { care: value.care }),
  }
}

/**
 * Arma los campos del producto: revisa que la línea exista y resuelve cada foto.
 *
 * @throws {ResponseError} Con `422` en `categoryId` ("Esa línea no existe") o en
 *   `images.N.publicId` si una foto no existe.
 */
function productFields(input: ProductInput, db: MockDb, current: readonly Image[]): ProductFields {
  if (!db.categories.some((category) => category.id === input.categoryId)) {
    throw new ResponseError(
      validationProblem([
        { field: 'categoryId', code: 'unknown_category', message: 'Esa línea no existe' },
      ]),
    )
  }
  return {
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    priceArs: input.priceArs,
    stock: input.stock,
    featured: input.featured,
    status: input.status,
    images: input.images.map((image, index) =>
      resolveImage(image, db, current, `images.${String(index)}`),
    ),
    tabsOverride: toTabsOverride(input.tabsOverride),
  }
}

/**
 * Revisa que el slug no lo use otro producto, ni como actual ni como anterior.
 *
 * @throws {ResponseError} Con `409 slug_taken`.
 */
function assertSlugFree(db: MockDb, slug: string, ownId: string | null): void {
  const taken = db.products.some(
    (product) =>
      product.id !== ownId && (product.slug === slug || product.previousSlugs.includes(slug)),
  )
  if (taken) throw slugTaken(slug)
}

/**
 * Rutas del dashboard para productos: listado, alta, consulta, edición y archivo.
 *
 * Las escrituras piden el token CSRF y avisan que cambió el catálogo (`products`). Cambiar el slug
 * guarda el anterior en `previousSlugs` (la tienda lo redirige), y volver a uno propio anterior lo
 * saca de la lista. `PATCH` con `expectedUpdatedAt` distinto del guardado responde
 * `409 product_changed` sin guardar nada.
 */
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

  route('POST', '/admin/products', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const input = parseOrFail(productInputSchema, normalizeProductBody(await ctx.body()))
    const fields = productFields(input, ctx.db, [])
    assertSlugFree(ctx.db, input.slug, null)
    const now = ctx.now.toISOString()
    const product: MockProduct = {
      id: `prd-${randomUuid()}`,
      slug: input.slug,
      sequence: Math.max(0, ...ctx.db.products.map((candidate) => candidate.sequence)) + 1,
      ...fields,
      previousSlugs: [],
      createdAt: now,
      updatedAt: now,
    }
    ctx.db.products.push(product)
    ctx.invalidate(['products'])
    return json(toAdminProduct(product, ctx.db), 201)
  }),

  route('GET', '/admin/products/{id}', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    return json(toAdminProduct(findProduct(ctx), ctx.db))
  }),

  route('PATCH', '/admin/products/{id}', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const product = findProduct(ctx)
    const input = parseOrFail(productInputSchema, normalizeProductBody(await ctx.body()))
    if (
      input.expectedUpdatedAt !== undefined &&
      Date.parse(input.expectedUpdatedAt) !== Date.parse(product.updatedAt)
    ) {
      throw new ResponseError(
        problem(409, 'El producto cambió', {
          type: 'product_changed',
          detail: 'El producto cambió desde que lo abriste.',
        }),
      )
    }
    const fields = productFields(input, ctx.db, product.images)
    assertSlugFree(ctx.db, input.slug, product.id)
    if (input.slug !== product.slug) {
      product.previousSlugs = [
        ...product.previousSlugs.filter((slug) => slug !== input.slug),
        product.slug,
      ]
      product.slug = input.slug
    }
    Object.assign(product, fields, { updatedAt: ctx.now.toISOString() })
    ctx.invalidate(['products'])
    return json(toAdminProduct(product, ctx.db))
  }),

  // Archivar dos veces da lo mismo; se vuelve a publicar con un PATCH con `status: published`.
  route('POST', '/admin/products/{id}/archive', (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const product = findProduct(ctx)
    if (product.status !== 'archived') {
      product.status = 'archived'
      product.updatedAt = ctx.now.toISOString()
    }
    ctx.invalidate(['products'])
    return json(toAdminProduct(product, ctx.db))
  }),
]
