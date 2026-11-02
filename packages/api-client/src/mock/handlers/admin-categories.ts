import { categoryFormSchema, categoryOrderSchema } from '@galpon/schemas'
import type { MockContext, MockRoute } from '../router'
import type { MockCategory, MockDb } from '../types'
import { json, noContent, notFound, problem, ResponseError, validationProblem } from '../http'
import { resolveImage, toCategory } from '../mappers'
import { route } from '../router'
import { randomUuid } from '../uuid'
import { parseOrFail } from '../validation'
import { requireAdmin } from './admin-auth'
import { slugTaken } from './admin-products'

/** Líneas ordenadas por posición. */
function byPosition(db: MockDb): MockCategory[] {
  return [...db.categories].sort((a, b) => a.position - b.position)
}

/** Busca la línea de la ruta (`{id}`). */
function findCategory(ctx: MockContext): MockCategory {
  const category = ctx.db.categories.find((candidate) => candidate.id === ctx.params.id)
  if (category === undefined) throw new ResponseError(notFound('No existe esa línea.'))
  return category
}

/**
 * Valida el cuerpo de una línea, revisa que el slug no lo use otra y resuelve la foto.
 *
 * @param ctx - Contexto del pedido.
 * @param current - La línea que se edita, o `null` al crear.
 * @returns Los campos de la línea, con la foto ya armada.
 * @throws {ResponseError} Con `422` si un campo no sirve o la foto no existe (`image.publicId`),
 *   y con `409 slug_taken` si otra línea usa el slug.
 */
async function categoryFields(
  ctx: MockContext,
  current: MockCategory | null,
): Promise<Omit<MockCategory, 'id' | 'position'>> {
  const input = parseOrFail(categoryFormSchema, await ctx.body())
  const own = current?.image ?? null
  const image =
    input.image === null
      ? null
      : resolveImage(input.image, ctx.db, own === null ? [] : [own], 'image')
  if (ctx.db.categories.some((other) => other !== current && other.slug === input.slug)) {
    throw slugTaken(input.slug)
  }
  return { slug: input.slug, name: input.name, group: input.group, blurb: input.blurb, image }
}

/**
 * Rutas del dashboard para las líneas de productos: listado, alta, edición, borrado y orden.
 *
 * Las escrituras piden el token CSRF y avisan que cambiaron las líneas (`categories`; editar una
 * también avisa `products`, porque las fichas muestran el nombre y el slug de su línea). Solo se
 * borra una línea sin productos de ningún estado, y después se renumeran las posiciones.
 */
export const adminCategoriesRoutes: readonly MockRoute[] = [
  route('GET', '/admin/categories', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    return json(byPosition(ctx.db).map((category) => toCategory(category, ctx.db)))
  }),

  route('POST', '/admin/categories', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const fields = await categoryFields(ctx, null)
    const category: MockCategory = {
      id: `cat-${randomUuid()}`,
      position: Math.max(0, ...ctx.db.categories.map((candidate) => candidate.position)) + 1,
      ...fields,
    }
    ctx.db.categories.push(category)
    ctx.invalidate(['categories'])
    return json(toCategory(category, ctx.db), 201)
  }),

  route('PATCH', '/admin/categories/{id}', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const category = findCategory(ctx)
    Object.assign(category, await categoryFields(ctx, category))
    ctx.invalidate(['categories', 'products'])
    return json(toCategory(category, ctx.db))
  }),

  route('DELETE', '/admin/categories/{id}', (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const category = findCategory(ctx)
    if (ctx.db.products.some((product) => product.categoryId === category.id)) {
      throw new ResponseError(
        problem(409, 'La línea tiene productos', {
          type: 'category_has_products',
          detail: 'Mové o borrá los productos de la línea antes de borrarla.',
        }),
      )
    }
    ctx.db.categories = byPosition(ctx.db).filter((candidate) => candidate !== category)
    ctx.db.categories.forEach((candidate, index) => {
      candidate.position = index + 1
    })
    ctx.invalidate(['categories'])
    return noContent()
  }),

  route('PUT', '/admin/categories/order', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const { ids } = parseOrFail(categoryOrderSchema, await ctx.body())
    const categories = ids.map((id) => ctx.db.categories.find((candidate) => candidate.id === id))
    if (ids.length !== ctx.db.categories.length || categories.includes(undefined)) {
      return validationProblem([
        {
          field: 'ids',
          code: 'invalid_value',
          message: 'El orden tiene que tener todas las líneas, una vez cada una.',
        },
      ])
    }
    for (const [index, category] of categories.entries()) {
      if (category !== undefined) category.position = index + 1
    }
    ctx.invalidate(['categories'])
    return noContent()
  }),
]
