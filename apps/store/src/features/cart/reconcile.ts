import { z } from 'zod'
import type { Combo, ProductSummary } from '@galpon/api-client'
import type { CartLine } from '@galpon/domain'
import { lineProductIds } from './cart-lines'

/**
 * Lo último que se vio de los productos del carrito, solo para avisar cuando algo cambia (spec
 * 9.4: "se toma el valor nuevo y se avisa una vez"). No se usa para calcular nada: los precios
 * siempre salen del catálogo.
 */
export interface SeenValues {
  /**
   * Último precio de lista visto de cada producto del carrito, por id, y el precio final de cada
   * combo, por id del combo.
   */
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
  /** Se quitaron `count` líneas porque su producto o su combo ya no está a la venta. */
  | { kind: 'removed'; count: number }
  /** Se bajó la cantidad de una línea porque el stock alcanza para `quantity` unidades. */
  | { kind: 'reduced'; name: string; quantity: number }
  /** Cambió el precio de un producto o de un combo del carrito. */
  | { kind: 'price-changed'; name: string }
  /** Cambió el descuento del kit. */
  | { kind: 'kit-discount-changed'; percent: number }

/** Lo que necesita {@link reconcileCart}. */
export interface ReconcileInput {
  /** Líneas del carrito tal como están guardadas. */
  lines: readonly CartLine[]
  /** Productos que devuelve el catálogo para los ids del carrito (los que no están a la venta no vienen). */
  products: readonly ProductSummary[]
  /**
   * Combos a la venta (`GET /combos`), o `undefined` si no se consultaron (no hay combos en el
   * carrito): entonces las líneas de combo quedan como están.
   */
  combos?: readonly Combo[]
  /** Lo último que se vio. */
  seen: SeenValues
  /** Descuento actual del kit, o `null` si no se consultó (no hay kits en el carrito). */
  kitDiscountPercent: number | null
}

/** Resultado de {@link reconcileCart}. */
export interface ReconcileResult {
  /** Líneas ya conciliadas, en el mismo orden. */
  lines: CartLine[]
  /** Valores vistos actualizados (solo de los productos y los combos que quedan en el carrito). */
  seen: SeenValues
  /** Cambios para contarle al cliente. */
  notices: CartNotice[]
}

/** Una pieza que usa una línea: su nombre (para el aviso) y su tope de compra. */
interface LinePiece {
  /** Id del producto. */
  id: string
  /** Nombre del producto. */
  name: string
  /** Máximo que se puede pedir del producto (0 sin stock). */
  maxQuantity: number
}

/** Una línea que sigue a la venta, lista para repartir el stock. */
interface CheckedLine {
  /** La línea, con las piezas del combo al día. */
  line: CartLine
  /** Nombre con el que se avisa una baja de cantidad: el del combo, o `null` para usar el de la pieza. */
  name: string | null
  /** Las piezas que usa la línea. */
  pieces: LinePiece[]
}

/**
 * Revisa si una línea sigue a la venta y qué piezas usa: un producto o un kit con sus productos
 * del catálogo (todos tienen que venir y tener precio), un combo con sus piezas vigentes de la
 * lista de combos (tiene que venir y poder comprarse, salvo que solo le falte stock).
 *
 * @returns La línea revisada, o `null` si hay que quitarla.
 */
function checkLine(
  line: CartLine,
  byId: ReadonlyMap<string, ProductSummary>,
  combosById: ReadonlyMap<string, Combo>,
): CheckedLine | null {
  if (line.type === 'combo') {
    const combo = combosById.get(line.comboId)
    if (combo === undefined || (!combo.isPurchasable && !combo.isSoldOut)) return null
    return {
      line: { ...line, productIds: combo.items.map((item) => item.productId) },
      name: combo.name,
      pieces: combo.items.map((item) => ({
        id: item.productId,
        name: item.name,
        maxQuantity: item.maxQuantity,
      })),
    }
  }
  const ids = lineProductIds(line)
  const pieces = ids.flatMap((id) => {
    const product = byId.get(id)
    return product === undefined || product.priceArs === null ? [] : [product]
  })
  return pieces.length < ids.length ? null : { line, name: null, pieces }
}

/**
 * Concilia el carrito guardado con el catálogo actual, según la tabla del spec 9.4. Es una
 * función pura: no consulta nada ni toca el store.
 *
 * - Producto que no vino (despublicado, archivado o inexistente) o sin precio: se quita la línea.
 * - Combo que no vino en `GET /combos` o que no se puede comprar por otra cosa que el stock: se
 *   quita la línea. Si sigue, sus piezas se toman de la lista (el dashboard pudo cambiarlas).
 * - Producto o combo sin stock: la línea se queda (el panel la marca "Sin stock" y no deja
 *   finalizar) y no ocupa stock de otras líneas.
 * - Stock menor que la cantidad: se baja al máximo, contando el producto en todas las líneas
 *   (sueltas y dentro de kits y combos). Si las líneas anteriores ya usaron todo el stock, se quita.
 * - Precio de un producto, precio final de un combo o descuento del kit distintos de lo último
 *   visto: se avisa una vez.
 *
 * @param input - Ver {@link ReconcileInput}.
 * @returns Las líneas conciliadas, los valores vistos nuevos y los avisos.
 */
export function reconcileCart({
  lines,
  products,
  combos,
  seen,
  kitDiscountPercent,
}: ReconcileInput): ReconcileResult {
  const byId = new Map(products.map((product) => [product.id, product]))
  const combosById = new Map((combos ?? []).map((combo) => [combo.id, combo]))
  const used = new Map<string, number>()
  const kept: CartLine[] = []
  const notices: CartNotice[] = []
  let removed = 0
  const reduced: CartNotice[] = []

  for (const line of lines) {
    if (line.type === 'combo' && combos === undefined) {
      kept.push(line)
      continue
    }
    const checked = checkLine(line, byId, combosById)
    if (checked === null) {
      removed += 1
      continue
    }
    const { pieces } = checked
    if (pieces.some((piece) => piece.maxQuantity === 0)) {
      kept.push(checked.line)
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
      reduced.push({ kind: 'reduced', name: checked.name ?? tightest.piece.name, quantity })
    }
    for (const piece of pieces) used.set(piece.id, (used.get(piece.id) ?? 0) + quantity)
    kept.push(quantity === line.quantity ? checked.line : { ...checked.line, quantity })
  }

  if (removed > 0) notices.push({ kind: 'removed', count: removed })
  notices.push(...reduced)

  const prices: Record<string, number> = {}
  const remember = (id: string, price: number, name: string): void => {
    if (Object.hasOwn(prices, id)) return
    prices[id] = price
    if (Object.hasOwn(seen.prices, id) && seen.prices[id] !== price) {
      notices.push({ kind: 'price-changed', name })
    }
  }
  for (const line of kept) {
    if (line.type === 'combo') {
      const combo = combosById.get(line.comboId)
      const carried = Object.hasOwn(seen.prices, line.comboId)
        ? seen.prices[line.comboId]
        : undefined
      if (combo !== undefined) remember(combo.id, combo.priceArs, combo.name)
      else if (carried !== undefined) prices[line.comboId] = carried
      continue
    }
    for (const id of lineProductIds(line)) {
      const product = byId.get(id)
      if (product !== undefined && product.priceArs !== null) {
        remember(id, product.priceArs, product.name)
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
