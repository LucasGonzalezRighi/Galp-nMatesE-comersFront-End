import type { ProductSummary } from '@galpon/api-client'
import type { CartLine, CartTotals, LineAmounts } from '@galpon/domain'
import {
  cartLineKey,
  cartTotals,
  kitLineAmounts,
  pesos,
  productLineAmounts,
  remainingQuantityFor,
} from '@galpon/domain'
import { cartUnitCount, lineProductIds } from './cart-lines'
import { CART_COPY, leatherLabel } from './cart.copy'

/**
 * Estado de una línea en el panel:
 * - `ready`: se conocen todos sus datos y tiene stock.
 * - `sold-out`: algún producto se quedó sin stock (o sin precio); no suma y bloquea el checkout.
 * - `loading`: todavía no llegaron los datos de sus productos (o el descuento del kit).
 */
export type CartLineStatus = 'ready' | 'sold-out' | 'loading'

/** Una línea lista para dibujar: los datos del catálogo ya resueltos. */
export interface CartLineView {
  /** Clave de la línea (`cartLineKey` de `@galpon/domain`). */
  key: string
  /** La línea guardada. */
  line: CartLine
  /** Nombre del producto, o "Kit ronda completa". */
  name: string
  /** Detalle de una línea: cuero y virola de un mate, o las tres piezas de un kit. Vacío si no hay. */
  detail: string
  /** Foto del producto, o `null` (un kit no tiene foto propia; un producto puede no tenerla). */
  image: { url: string; alt: string } | null
  /** Cantidad de la línea. */
  quantity: number
  /** Cantidad máxima a la que se puede subir la línea, contando el producto en todas las líneas. */
  maxQuantity: number
  /** Estado de la línea. */
  status: CartLineStatus
  /** Importes de la línea; `null` si no está `ready`. */
  amounts: LineAmounts | null
  /**
   * "Precio sin impuestos nacionales" por unidad (`netPriceArs` del producto, Ley 27.743, spec 14.5).
   * `null` si el ajuste está apagado, la línea no está `ready`, el producto no lo trae o es un kit:
   * el dato público del kit no existe (el IVA es solo del admin), queda para la cotización.
   */
  netPriceArs: number | null
}

/** El carrito listo para dibujar. */
export interface CartView {
  /** Líneas, en el orden del carrito. */
  lines: CartLineView[]
  /** Totales de las líneas `ready` (sin envío). */
  totals: CartTotals
  /** Unidades del carrito (cada kit cuenta como una). */
  count: number
  /** Si se puede finalizar la compra: hay líneas y todas están `ready`. */
  canCheckout: boolean
}

/** Lo que necesita {@link buildCartView}. */
export interface CartViewInput {
  /** Líneas guardadas del carrito. */
  lines: readonly CartLine[]
  /** Productos del catálogo que se conocen. */
  products: readonly ProductSummary[]
  /** Descuento actual del kit, o `null` si todavía no se conoce. */
  kitDiscountPercent: number | null
  /** Si se muestra "Precio sin impuestos nacionales" (`PublicSettings.priceDisplay.showNetPrice`); por omisión no. */
  showNetPrice?: boolean
}

/**
 * Importes de una línea con todos sus datos. Si falta un precio, devuelve `null`.
 *
 * @param line - La línea.
 * @param pieces - Sus productos, en el orden de `lineProductIds`.
 * @param kitDiscountPercent - Descuento actual del kit.
 */
function lineAmounts(
  line: CartLine,
  pieces: readonly ProductSummary[],
  kitDiscountPercent: number | null,
): LineAmounts | null {
  const prices: number[] = []
  for (const piece of pieces) {
    if (piece.priceArs === null) return null
    prices.push(piece.priceArs)
  }
  if (line.type === 'kit') {
    const [mate, bombilla, yerba] = prices
    if (mate === undefined || bombilla === undefined || yerba === undefined) return null
    if (kitDiscountPercent === null) return null
    return kitLineAmounts(
      [pesos(mate), pesos(bombilla), pesos(yerba)],
      line.quantity,
      kitDiscountPercent,
    )
  }
  const [price] = prices
  return price === undefined ? null : productLineAmounts(pesos(price), line.quantity)
}

/** Arma la vista de una línea; ver {@link buildCartView}. */
function buildLineView(
  line: CartLine,
  byId: ReadonlyMap<string, ProductSummary>,
  lines: readonly CartLine[],
  kitDiscountPercent: number | null,
  showNetPrice: boolean,
): CartLineView {
  const key = cartLineKey(line)
  const ids = lineProductIds(line)
  const pieces = ids.flatMap((id) => {
    const product = byId.get(id)
    return product === undefined ? [] : [product]
  })
  const [first] = pieces
  const unresolved =
    pieces.length < ids.length || (line.type === 'kit' && kitDiscountPercent === null)
  const soldOut = pieces.some((piece) => piece.priceArs === null || piece.maxQuantity === 0)
  const status: CartLineStatus = unresolved ? 'loading' : soldOut ? 'sold-out' : 'ready'
  const room = Math.min(
    ...pieces.map((piece) => remainingQuantityFor(piece.id, piece.maxQuantity, lines)),
  )
  const maxQuantity = line.quantity + (pieces.length === 0 ? 0 : room)

  const amounts = status === 'ready' ? lineAmounts(line, pieces, kitDiscountPercent) : null

  if (line.type === 'kit') {
    return {
      key,
      line,
      name: CART_COPY.kitName,
      detail:
        unresolved || pieces.length < 3
          ? ''
          : `${pieces.map((piece) => piece.name).join(' + ')} · ${leatherLabel(line.leather)}`,
      image: null,
      quantity: line.quantity,
      maxQuantity,
      status,
      amounts,
      netPriceArs: null,
    }
  }
  const options = line.options
  const image = first?.mainImage
  return {
    key,
    line,
    name: first?.name ?? CART_COPY.loadingLine,
    detail: options === undefined ? '' : `${leatherLabel(options.leather)} · ${options.ferrule}`,
    image: image === null || image === undefined ? null : { url: image.url, alt: image.alt },
    quantity: line.quantity,
    maxQuantity,
    status,
    amounts,
    netPriceArs: showNetPrice && status === 'ready' ? (first?.netPriceArs ?? null) : null,
  }
}

/**
 * Junta las líneas guardadas con los datos del catálogo y arma lo que dibuja el panel. Todos los
 * importes salen de `@galpon/domain` (`productLineAmounts`, `kitLineAmounts` y `cartTotals`); acá
 * no se calcula ningún precio ni ahorro.
 *
 * @param input - Ver {@link CartViewInput}.
 * @returns Las líneas con su estado y sus importes, los totales sin envío y si se puede finalizar.
 */
export function buildCartView({
  lines,
  products,
  kitDiscountPercent,
  showNetPrice = false,
}: CartViewInput): CartView {
  const byId = new Map(products.map((product) => [product.id, product]))
  const views = lines.map((line) =>
    buildLineView(line, byId, lines, kitDiscountPercent, showNetPrice),
  )
  const amounts = views.flatMap((view) => (view.amounts === null ? [] : [view.amounts]))
  return {
    lines: views,
    totals: cartTotals(amounts, null),
    count: cartUnitCount(lines),
    canCheckout: views.length > 0 && views.every((view) => view.status === 'ready'),
  }
}
