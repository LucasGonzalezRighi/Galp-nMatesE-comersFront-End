import { hasDistinctGroups, pesos, sumPesos } from '@galpon/domain'
import { comboFormSchema, comboOrderSchema, MESSAGES } from '@galpon/schemas'
import type { FieldError } from '../../generated/schema'
import type { MockContext, MockRoute } from '../router'
import type { MockCombo, MockDb } from '../types'
import { json, noContent, notFound, ResponseError, validationProblem } from '../http'
import { toCombo } from '../mappers'
import { route } from '../router'
import { randomUuid } from '../uuid'
import { parseOrFail } from '../validation'
import { requireAdmin } from './admin-auth'
import { groupOf } from './pricing'

/** Combos ordenados por posición. */
function byPosition(db: MockDb): MockCombo[] {
  return [...db.combos].sort((a, b) => a.position - b.position)
}

/** Busca el combo de la ruta (`{id}`). */
function findCombo(ctx: MockContext): MockCombo {
  const combo = ctx.db.combos.find((candidate) => candidate.id === ctx.params.id)
  if (combo === undefined) throw new ResponseError(notFound('No existe ese combo.'))
  return combo
}

/**
 * Valida el cuerpo de un combo con `comboFormSchema` y con la base: cada producto tiene que estar
 * publicado y con precio; con todos válidos, tienen que ser de grupos distintos y el precio tiene
 * que ser menor que la suma de sus precios de lista.
 *
 * @param ctx - Contexto del pedido.
 * @returns Los campos editables del combo, ya normalizados.
 * @throws {ResponseError} Con `422` y el error en cada campo (`productIds.N`, `productIds`,
 *   `priceArs`), con los mensajes de `MESSAGES`.
 */
async function comboFields(ctx: MockContext): Promise<Omit<MockCombo, 'id' | 'position'>> {
  const input = parseOrFail(comboFormSchema, await ctx.body())
  const errors: FieldError[] = []
  const pieces = input.productIds.flatMap((id, index) => {
    const product = ctx.db.products.find((candidate) => candidate.id === id)
    const group = product === undefined ? undefined : groupOf(ctx.db, product)
    if (product?.status !== 'published' || product.priceArs === null || group === undefined) {
      errors.push({
        field: `productIds.${String(index)}`,
        code: 'product_unavailable',
        message: MESSAGES.comboProductUnavailable,
      })
      return []
    }
    return [{ group, priceArs: pesos(product.priceArs) }]
  })
  if (errors.length === 0) {
    if (!hasDistinctGroups(pieces.map((piece) => piece.group))) {
      errors.push({
        field: 'productIds',
        code: 'duplicate_group',
        message: MESSAGES.comboDistinctGroups,
      })
    }
    const sum = sumPesos(pieces.map((piece) => piece.priceArs))
    if (input.priceArs >= sum) {
      errors.push({
        field: 'priceArs',
        code: 'price_not_below_sum',
        message: MESSAGES.comboPriceNotBelowSum(sum),
      })
    }
  }
  if (errors.length > 0) throw new ResponseError(validationProblem(errors))
  return {
    name: input.name,
    description: input.description,
    productIds: input.productIds,
    priceArs: input.priceArs,
    status: input.status,
  }
}

/**
 * Rutas del dashboard para los combos: listado, alta, edición, borrado y orden.
 *
 * Las escrituras piden el token CSRF y avisan a la tienda que cambiaron los combos (`combos`).
 * Borrar renumera las posiciones; los pedidos guardan su copia del combo.
 */
export const adminCombosRoutes: readonly MockRoute[] = [
  route('GET', '/admin/combos', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    return json(byPosition(ctx.db).map((combo) => toCombo(combo, ctx.db, ctx.now)))
  }),

  route('POST', '/admin/combos', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const fields = await comboFields(ctx)
    const combo: MockCombo = {
      id: `cmb-${randomUuid()}`,
      position: Math.max(0, ...ctx.db.combos.map((candidate) => candidate.position)) + 1,
      ...fields,
    }
    ctx.db.combos.push(combo)
    ctx.invalidate(['combos'])
    return json(toCombo(combo, ctx.db, ctx.now), 201)
  }),

  route('PATCH', '/admin/combos/{id}', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const combo = findCombo(ctx)
    Object.assign(combo, await comboFields(ctx))
    ctx.invalidate(['combos'])
    return json(toCombo(combo, ctx.db, ctx.now))
  }),

  route('DELETE', '/admin/combos/{id}', (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const combo = findCombo(ctx)
    ctx.db.combos = byPosition(ctx.db).filter((candidate) => candidate !== combo)
    ctx.db.combos.forEach((candidate, index) => {
      candidate.position = index + 1
    })
    ctx.invalidate(['combos'])
    return noContent()
  }),

  route('PUT', '/admin/combos/order', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const { ids } = parseOrFail(comboOrderSchema, await ctx.body())
    const combos = ids.map((id) => ctx.db.combos.find((candidate) => candidate.id === id))
    if (ids.length !== ctx.db.combos.length || combos.includes(undefined)) {
      return validationProblem([
        {
          field: 'ids',
          code: 'invalid_value',
          message: 'El orden tiene que tener todos los combos, una vez cada uno.',
        },
      ])
    }
    for (const [index, combo] of combos.entries()) {
      if (combo !== undefined) combo.position = index + 1
    }
    ctx.invalidate(['combos'])
    return noContent()
  }),
]
