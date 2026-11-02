import type { CartItemInput, CartQuoteInput } from '@galpon/api-client'
import type { CartLine } from '@galpon/domain'
import { assertValidQuantity } from '@galpon/domain'
import type { SeenValues } from './reconcile'
import { lineProductIds } from './cart-lines'

/**
 * Precio de lista por unidad que el carrito ya tenía de una línea: el del producto, o la suma de
 * las tres piezas en un kit (sin el descuento). Si falta el precio de alguna pieza, `undefined`.
 *
 * @param line - Línea del carrito.
 * @param prices - Últimos precios vistos, por id de producto.
 */
function expectedUnitPrice(
  line: CartLine,
  prices: Readonly<Record<string, number>>,
): number | undefined {
  let total = 0
  for (const id of lineProductIds(line)) {
    const price = Object.hasOwn(prices, id) ? prices[id] : undefined
    if (price === undefined || !Number.isInteger(price) || price < 0) return undefined
    total += price
  }
  return total
}

/**
 * Arma el cuerpo de `POST /cart/quote` (y las líneas de `POST /orders`) desde el carrito guardado.
 *
 * Cada línea trae `expectedUnitPriceArs` con el precio que el carrito ya tenía (el del producto o,
 * en un kit, la suma de sus tres piezas), así un cambio de precio llega como `price_changed` y no
 * recién como `total_changed` al crear el pedido. Si no se conoce el precio de alguna línea, esa
 * línea no lo manda. Los productos que no son mates llevan `options: null`, como pide el contrato.
 *
 * @param lines - Líneas del carrito, en el orden en que se guardaron (no se modifican).
 * @param seen - Lo último que se vio del catálogo (`seen` del store del carrito); sin esto no se
 *   manda ningún precio esperado.
 * @returns Las líneas a cotizar, en el mismo orden.
 * @throws {RangeError} Si la cantidad de alguna línea no es un entero mayor o igual a 1.
 * @example
 * const { lines, seen } = useCartStore.getState()
 * const input = buildCartQuoteInput(lines, seen)
 */
export function buildCartQuoteInput(
  lines: readonly CartLine[],
  seen?: Pick<SeenValues, 'prices'>,
): CartQuoteInput {
  const items = lines.map((line): CartItemInput => {
    assertValidQuantity(line.quantity)
    const expected = seen === undefined ? undefined : expectedUnitPrice(line, seen.prices)
    const price = expected === undefined ? {} : { expectedUnitPriceArs: expected }
    if (line.type === 'kit') {
      const { mateId, bombillaId, yerbaId, leather, quantity } = line
      return { type: 'kit', mateId, bombillaId, yerbaId, leather, quantity, ...price }
    }
    return {
      type: 'product',
      productId: line.productId,
      quantity: line.quantity,
      options: line.options ?? null,
      ...price,
    }
  })
  return { items }
}
