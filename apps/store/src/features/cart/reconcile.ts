import { z } from 'zod'
import type { ProductSummary } from '@galpon/api-client'
import type { CartLine } from '@galpon/domain'
import { lineProductIds } from './cart-lines'

/**
 * Lo último que se vio de los productos del carrito, solo para avisar cuando algo cambia (spec
 * 9.4: "se toma el valor nuevo y se avisa una vez"). No se usa para calcular nada: los precios
 * siempre salen del catálogo.
 */
export interface SeenValues {
  /** Último precio de lista visto de cada producto del carrito, por id. */
  prices: Record<string, number>
  /** Último descuento del kit visto, o `null` si todavía no se vio ninguno. */
  kitDiscountPercent: number | null
}

/** Estado inicial: todavía no se vio nada. */
export const EMPTY_SEEN: SeenValues = { prices: {}, kitDiscountPercent: null }

/** Forma de {@link SeenValues} guardada en `localStorage`. */
const seenSchema = z.object({
  prices: z.record(z.string().min(1).max(100), z.int().min(0)),
  kitDiscountPercent: z.int().min(0).max(100).nullable(),
})

/**
 * Lee lo "visto" que se guardó en `localStorage`, sin confiar en su forma.
 *
 * @param value - Lo que había guardado.
 * @returns Lo guardado si es válido; si no, {@link EMPTY_SEEN}.
 */
export function parseSeenValues(value: unknown): SeenValues {
  const parsed = seenSchema.safeParse(value)
  return parsed.success ? parsed.data : { prices: {}, kitDiscountPercent: null }
}

/** Algo que cambió en el carrito al conciliarlo con el catálogo y que hay que contarle al cliente. */
export type CartNotice =
  /** Se quitaron `count` líneas porque su producto ya no está a la venta. */
  | { kind: 'removed'; count: number }
  /** Se bajó la cantidad de una línea porque el stock alcanza para `quantity` unidades. */
  | { kind: 'reduced'; name: string; quantity: number }
  /** Cambió el precio de un producto del carrito. */
  | { kind: 'price-changed'; name: string }
  /** Cambió el descuento del kit. */
  | { kind: 'kit-discount-changed'; percent: number }

/** Lo que necesita {@link reconcileCart}. */
export interface ReconcileInput {
  /** Líneas del carrito tal como están guardadas. */
  lines: readonly CartLine[]
  /** Productos que devuelve el catálogo para los ids del carrito (los que no están a la venta no vienen). */
  products: readonly ProductSummary[]
  /** Lo último que se vio. */
  seen: SeenValues
  /** Descuento actual del kit, o `null` si no se consultó (no hay kits en el carrito). */
  kitDiscountPercent: number | null
}

/** Resultado de {@link reconcileCart}. */
export interface ReconcileResult {
  /** Líneas ya conciliadas, en el mismo orden. */
  lines: CartLine[]
  /** Valores vistos actualizados (solo de los productos que quedan en el carrito). */
  seen: SeenValues
  /** Cambios para contarle al cliente. */
  notices: CartNotice[]
}

/**
 * Concilia el carrito guardado con el catálogo actual, según la tabla del spec 9.4. Es una
 * función pura: no consulta nada ni toca el store.
 *
 * - Producto que no vino (despublicado, archivado o inexistente) o sin precio: se quita la línea.
 * - Producto sin stock: la línea se queda (el panel la marca "Sin stock" y no deja finalizar) y no
 *   ocupa stock de otras líneas.
 * - Stock menor que la cantidad: se baja al máximo, contando el producto en todas las líneas
 *   (sueltas y dentro de kits). Si las líneas anteriores ya usaron todo el stock, se quita.
 * - Precio o descuento del kit distintos de lo último visto: se avisa una vez.
 *
 * @param input - Ver {@link ReconcileInput}.
 * @returns Las líneas conciliadas, los valores vistos nuevos y los avisos.
 */
export function reconcileCart({
  lines,
  products,
  seen,
  kitDiscountPercent,
}: ReconcileInput): ReconcileResult {
  const byId = new Map(products.map((product) => [product.id, product]))
  const used = new Map<string, number>()
  const kept: CartLine[] = []
  const notices: CartNotice[] = []
  let removed = 0
  const reduced: CartNotice[] = []

  for (const line of lines) {
    const ids = lineProductIds(line)
    const pieces = ids.flatMap((id) => {
      const product = byId.get(id)
      return product === undefined || product.priceArs === null ? [] : [product]
    })
    if (pieces.length < ids.length) {
      removed += 1
      continue
    }
    if (pieces.some((piece) => piece.maxQuantity === 0)) {
      kept.push(line)
      continue
    }
    const rooms = pieces.map((piece) => ({
      piece,
      room: piece.maxQuantity - (used.get(piece.id) ?? 0),
    }))
    const tightest = rooms.reduce((a, b) => (b.room < a.room ? b : a))
    const quantity = Math.min(line.quantity, tightest.room)
    if (quantity < 1) {
      removed += 1
      continue
    }
    if (quantity < line.quantity) {
      reduced.push({ kind: 'reduced', name: tightest.piece.name, quantity })
    }
    for (const piece of pieces) used.set(piece.id, (used.get(piece.id) ?? 0) + quantity)
    kept.push(quantity === line.quantity ? line : { ...line, quantity })
  }

  if (removed > 0) notices.push({ kind: 'removed', count: removed })
  notices.push(...reduced)

  const prices: Record<string, number> = {}
  for (const line of kept) {
    for (const id of lineProductIds(line)) {
      const price = byId.get(id)?.priceArs
      if (price === undefined || price === null || Object.hasOwn(prices, id)) continue
      prices[id] = price
      if (Object.hasOwn(seen.prices, id) && seen.prices[id] !== price) {
        notices.push({ kind: 'price-changed', name: byId.get(id)?.name ?? id })
      }
    }
  }

  let nextKitDiscount = seen.kitDiscountPercent
  if (kitDiscountPercent !== null && kept.some((line) => line.type === 'kit')) {
    if (seen.kitDiscountPercent !== null && seen.kitDiscountPercent !== kitDiscountPercent) {
      notices.push({ kind: 'kit-discount-changed', percent: kitDiscountPercent })
    }
    nextKitDiscount = kitDiscountPercent
  }

  return { lines: kept, seen: { prices, kitDiscountPercent: nextKitDiscount }, notices }
}
