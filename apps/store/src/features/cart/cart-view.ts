import type { CartQuote, CartQuoteLine, ProductSummary } from '@galpon/api-client'
import type { CartLine } from '@galpon/domain'
import { cartLineKey, remainingQuantityFor } from '@galpon/domain'
import { cartUnitCount, lineProductIds } from './cart-lines'
import { CART_COPY, priceChangedNotice, quantityReducedNotice } from './cart.copy'

/**
 * Estado de una línea en el panel:
 * - `ready`: la cotización la trae con importes y se puede comprar.
 * - `sold-out`: la cotización dice que no queda stock (`sold_out`) o que ya no está a la venta
 *   (`unavailable`); no suma y bloquea el checkout.
 * - `loading`: la cotización todavía no trae esta línea.
 */
export type CartLineStatus = 'ready' | 'sold-out' | 'loading'

/** Problema que informa la cotización de una línea (`CartQuoteLine.issue`, sin el caso "sin problema"). */
export type CartLineIssue = NonNullable<CartQuoteLine['issue']>

/** Una línea lista para dibujar: los importes de la cotización más la foto del catálogo. */
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
  /** Cantidad de la línea; si la cotización la bajó por stock (`quantity_reduced`), la cotizada. */
  quantity: number
  /** Cantidad máxima a la que se puede subir la línea, contando el producto en todas las líneas. */
  maxQuantity: number
  /** Estado de la línea. */
  status: CartLineStatus
  /** Problema que informa la cotización, o `null` si no hay (o todavía no hay cotización). */
  issue: CartLineIssue | null
  /** Aviso de la línea para el cliente (menos stock o cambio de precio), o `null` si no hay. */
  notice: string | null
  /** Importe de la línea ya sin el ahorro por kit; `null` si no está `ready`. */
  totalArs: number | null
  /** Ahorro por kit de toda la línea; 0 en un producto suelto o si no está `ready`. */
  kitSavingsArs: number
  /**
   * "Precio sin impuestos nacionales" de una unidad (Ley 27.743, spec 14.5), tal como lo calcula el
   * back sobre el precio efectivo (en un kit, con el descuento). `null` si el ajuste está apagado
   * o la línea no está `ready`: en una línea sin stock el back lo manda en 0 y no se muestra.
   */
  netUnitPriceArs: number | null
}

/** Totales del carrito, tal como los trae la cotización (sin envío). */
export interface CartViewTotals {
  /** Suma de los precios de lista de las líneas. */
  itemsGrossArs: number
  /** Suma de los ahorros por kit. */
  kitSavingsArs: number
  /** Importe de las líneas: el bruto menos el ahorro por kit. */
  subtotalArs: number
  /**
   * "Precio sin impuestos nacionales" del subtotal, tal como lo calcula el back: puede diferir unos
   * pesos de la suma de los netos por unidad. `null` si el ajuste está apagado o el subtotal es 0.
   */
  netSubtotalArs: number | null
}

/** El carrito listo para dibujar. */
export interface CartView {
  /** Líneas, en el orden del carrito. */
  lines: CartLineView[]
  /** Totales de la cotización (cero hasta que llega). */
  totals: CartViewTotals
  /** Unidades del carrito (cada kit cuenta como una). */
  count: number
  /** Si se puede finalizar la compra: hay líneas y todas están `ready`. */
  canCheckout: boolean
}

/** Lo que necesita {@link buildCartView}. */
export interface CartViewInput {
  /** Líneas guardadas del carrito. */
  lines: readonly CartLine[]
  /** Cotización de esas líneas (`POST /cart/quote`), o `null` si todavía no llegó. */
  quote: CartQuote | null
  /**
   * Productos del catálogo que se conocen. Solo aportan la foto, que la cotización no trae, y el
   * stock para que ninguna línea deje sin unidades a otra que usa el mismo producto; pueden faltar.
   */
  products?: readonly ProductSummary[]
}

/**
 * Aviso de una línea según el problema que informa la cotización.
 *
 * @param issue - Problema de la línea.
 * @param name - Nombre de la línea.
 * @param quantity - Unidades cotizadas.
 * @returns El texto, o `null` si el problema no se cuenta en la línea (el estado ya lo dice).
 */
function issueNotice(issue: CartLineIssue | null, name: string, quantity: number): string | null {
  switch (issue) {
    case 'quantity_reduced':
      return quantityReducedNotice(name, quantity)
    case 'price_changed':
      return priceChangedNotice(name)
    default:
      return null
  }
}

/**
 * Cantidad máxima de una línea según el stock del catálogo, contando cada producto en todas las
 * líneas (sueltas y dentro de kits). `null` si no se conoce alguno de sus productos.
 */
function catalogMaxQuantity(
  line: CartLine,
  byId: ReadonlyMap<string, ProductSummary>,
  lines: readonly CartLine[],
): number | null {
  const rooms: number[] = []
  for (const id of lineProductIds(line)) {
    const product = byId.get(id)
    if (product === undefined) return null
    rooms.push(remainingQuantityFor(product.id, product.maxQuantity, lines))
  }
  return line.quantity + Math.min(...rooms)
}

/** Arma la vista de una línea; ver {@link buildCartView}. */
function buildLineView(
  line: CartLine,
  quoted: CartQuoteLine | undefined,
  byId: ReadonlyMap<string, ProductSummary>,
  lines: readonly CartLine[],
): CartLineView {
  const product = line.type === 'product' ? byId.get(line.productId) : undefined
  const image = product?.mainImage
  const base = {
    key: cartLineKey(line),
    line,
    image: image === null || image === undefined ? null : { url: image.url, alt: image.alt },
    issue: null,
    notice: null,
    totalArs: null,
    kitSavingsArs: 0,
    netUnitPriceArs: null,
  }
  if (quoted === undefined) {
    return {
      ...base,
      name: line.type === 'kit' ? CART_COPY.kitName : (product?.name ?? CART_COPY.loadingLine),
      detail: '',
      quantity: line.quantity,
      maxQuantity: line.quantity,
      status: 'loading',
    }
  }

  const { issue } = quoted
  const blocked = issue === 'sold_out' || issue === 'unavailable'
  const reduced = issue === 'quantity_reduced'
  const name = line.type === 'kit' ? CART_COPY.kitName : quoted.name
  const quantity = reduced ? quoted.maxQuantity : line.quantity
  const catalogMax = reduced ? null : catalogMaxQuantity(line, byId, lines)
  return {
    ...base,
    name,
    detail: quoted.detail,
    quantity,
    maxQuantity:
      catalogMax === null ? quoted.maxQuantity : Math.min(quoted.maxQuantity, catalogMax),
    status: blocked ? 'sold-out' : 'ready',
    issue,
    notice: issueNotice(issue, name, quantity),
    totalArs: blocked ? null : quoted.totalArs,
    kitSavingsArs: blocked ? 0 : quoted.kitSavingsArs,
    netUnitPriceArs: blocked ? null : quoted.netUnitPriceArs,
  }
}

/**
 * Totales de la cotización tal como vienen; en cero hasta que llega.
 *
 * @param quote - Cotización, o `null`.
 */
function viewTotals(quote: CartQuote | null): CartViewTotals {
  if (quote === null) {
    return { itemsGrossArs: 0, kitSavingsArs: 0, subtotalArs: 0, netSubtotalArs: null }
  }
  return {
    itemsGrossArs: quote.itemsGrossArs,
    kitSavingsArs: quote.kitSavingsArs,
    subtotalArs: quote.subtotalArs,
    netSubtotalArs: quote.subtotalArs > 0 ? quote.netSubtotalArs : null,
  }
}

/**
 * Junta las líneas guardadas con su cotización y arma lo que dibuja el panel. Todos los importes,
 * los ahorros por kit, los precios sin impuestos y los problemas de cada línea vienen de la
 * cotización de la API (`POST /cart/quote`): acá no se calcula ningún precio. Cada línea se une a
 * su cotizada por clave (`cartLineKey`); una que la cotización todavía no trae está `loading`.
 *
 * @param input - Ver {@link CartViewInput}.
 * @returns Las líneas con su estado y sus importes, los totales sin envío y si se puede finalizar.
 */
export function buildCartView({ lines, quote, products = [] }: CartViewInput): CartView {
  const byId = new Map(products.map((product) => [product.id, product]))
  const quotedByKey = new Map((quote?.lines ?? []).map((quoted) => [quoted.key, quoted]))
  const views = lines.map((line) =>
    buildLineView(line, quotedByKey.get(cartLineKey(line)), byId, lines),
  )
  return {
    lines: views,
    totals: viewTotals(quote),
    count: cartUnitCount(lines),
    canCheckout: views.length > 0 && views.every((view) => view.status === 'ready'),
  }
}
