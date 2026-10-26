import { z } from 'zod'
import type { CartLine, LineAmounts, ProductGroup } from '@galpon/domain'
import {
  cartLineKey,
  cartTotals,
  FERRULES,
  formatPesos,
  KIT_FERRULE,
  kitLineAmounts,
  LEATHERS,
  MAX_QUANTITY_PER_PRODUCT,
  netPrice,
  pesos,
  productLineAmounts,
  quantityByProduct,
  remainingQuantityFor,
  sumPesos,
} from '@galpon/domain'
import type {
  CartQuote,
  CartQuoteLine,
  ChangeNotice,
  FieldError,
  OrderLine,
} from '../../generated/schema'
import type { MockDb, MockProduct, MockReservation } from '../types'
import { ResponseError, validationProblem } from '../http'

/** Nombre de una línea de kit, como lo pide el contrato. */
const KIT_NAME = 'Kit'

/** Nombre de una línea cuyo producto ya no existe. */
const MISSING_PRODUCT_NAME = 'Producto no disponible'

/** Identificador de un producto en el carrito. */
const idSchema = z.string().min(1).max(80)

/** Cantidad de una línea, de 1 al tope por compra. */
const quantitySchema = z
  .int({ error: 'La cantidad tiene que ser un número entero.' })
  .min(1, 'La cantidad tiene que ser al menos 1.')
  .max(
    MAX_QUANTITY_PER_PRODUCT,
    `La cantidad no puede pasar de ${String(MAX_QUANTITY_PER_PRODUCT)}.`,
  )

/**
 * Precio de lista por unidad que la tienda tenía cotizado (`expectedUnitPriceArs` del contrato):
 * si viene, una diferencia se avisa con `price_changed`.
 */
const expectedPriceSchema = z.int().min(0).optional()

/** Cuero y virola de un mate. */
const optionsSchema = z.object({ leather: z.enum(LEATHERS), ferrule: z.enum(FERRULES) })

/** Cuero y virola ya validados. */
type ItemOptions = z.output<typeof optionsSchema>

/** Línea del carrito como la manda la tienda (los `null` ya quitados). */
const cartItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('product'),
    productId: idSchema,
    quantity: quantitySchema,
    options: optionsSchema.optional(),
    expectedUnitPriceArs: expectedPriceSchema,
  }),
  z.object({
    type: z.literal('kit'),
    mateId: idSchema,
    bombillaId: idSchema,
    yerbaId: idSchema,
    leather: z.enum(LEATHERS),
    quantity: quantitySchema,
    expectedUnitPriceArs: expectedPriceSchema,
  }),
])

/** Líneas del carrito: de 1 a 50, como en el contrato. */
export const cartItemsSchema = z
  .array(cartItemSchema)
  .min(1, 'Agregá al menos un producto.')
  .max(50, 'El carrito puede tener hasta 50 líneas.')

/** Línea del carrito ya validada. */
export type CartItem = z.output<typeof cartItemSchema>

/** Línea cotizada, con lo que hace falta para armar el pedido y los avisos de cambios. */
export interface PricedLine {
  /** La línea como se devuelve en la cotización. */
  quote: CartQuoteLine
  /** Importes de la línea, o `null` si no se puede comprar. */
  amounts: LineAmounts | null
  /** La línea del pedido, o `null` si no se puede comprar. */
  orderLine: OrderLine | null
  /** Producto que explica el problema de la línea (la pieza agotada de un kit), o `null`. */
  productId: string | null
  /** Nombre del producto que explica el problema, para los avisos. */
  productName: string
}

/** Cotización entera del carrito. */
export interface PricedCart {
  /** Líneas cotizadas, en el orden del carrito. */
  lines: PricedLine[]
  /** La cotización como la devuelve `POST /cart/quote`. */
  quote: CartQuote
  /** Unidades que el pedido reservaría, por producto. */
  reservation: MockReservation[]
}

/**
 * Unidades de un producto que se pueden vender: el stock menos lo que reservan los pedidos que
 * todavía esperan el pago y no vencieron.
 *
 * @param db - Base simulada.
 * @param product - Producto.
 * @param now - Momento del pedido.
 */
export function availableStock(db: MockDb, product: MockProduct, now: Date): number {
  let reserved = 0
  for (const order of db.orders) {
    if (order.status !== 'pending_payment' || Date.parse(order.reservedUntil) <= now.getTime()) {
      continue
    }
    for (const entry of order.reservation) {
      if (entry.productId === product.id) reserved += entry.quantity
    }
  }
  return Math.max(0, product.stock - reserved)
}

/** Grupo de un producto según su línea. */
function groupOf(db: MockDb, product: MockProduct): ProductGroup | undefined {
  return db.categories.find((category) => category.id === product.categoryId)?.group
}

/** Producto que se puede vender: publicado, con precio y, si se pide, del grupo indicado. */
function sellable(
  db: MockDb,
  product: MockProduct | undefined,
  group: ProductGroup | undefined,
): product is MockProduct & { priceArs: number } {
  return (
    product?.status === 'published' &&
    product.priceArs !== null &&
    (group === undefined || groupOf(db, product) === group)
  )
}

/** Cuero escrito como en el carrito de la tienda: "Cuero negro". */
function leatherLabel(leather: string): string {
  return `Cuero ${leather.toLowerCase()}`
}

/** Línea del carrito del dominio, con la cantidad indicada. */
function toCartLine(item: CartItem, options: ItemOptions | undefined, quantity: number): CartLine {
  if (item.type === 'kit') {
    const { mateId, bombillaId, yerbaId, leather } = item
    return { type: 'kit', mateId, bombillaId, yerbaId, leather, quantity }
  }
  return {
    type: 'product',
    productId: item.productId,
    quantity,
    ...(options === undefined ? {} : { options }),
  }
}

/** Línea que no se puede comprar: todos los importes en 0. */
function blockedLine(
  base: Pick<CartQuoteLine, 'key' | 'type' | 'name' | 'detail'>,
  issue: 'sold_out' | 'unavailable',
  showNetPrice: boolean,
): CartQuoteLine {
  return {
    ...base,
    unitPriceArs: 0,
    netUnitPriceArs: showNetPrice ? 0 : null,
    kitSavingsArs: 0,
    totalArs: 0,
    maxQuantity: 0,
    issue,
  }
}

/**
 * Cotiza el carrito con los precios, el descuento del kit y el stock disponible de la base.
 *
 * Usa las reglas de `@galpon/domain`: el tope por producto vale para todas las líneas (sueltas y
 * dentro de kits), en orden, y los importes salen de `productLineAmounts`, `kitLineAmounts` y
 * `cartTotals`. Una línea con problemas no hace fallar la cotización: se informa en `issue`.
 *
 * @param db - Base simulada.
 * @param items - Líneas del carrito, ya validadas con {@link cartItemsSchema}.
 * @param now - Momento del pedido (para no vender stock reservado).
 * @returns La cotización, los datos de cada línea y lo que se reservaría.
 * @throws {ResponseError} Con `422` si un mate llega sin cuero ni virola.
 */
export function priceCart(db: MockDb, items: readonly CartItem[], now: Date): PricedCart {
  const { kitDiscountPercent, vatRatePercent } = db.settings
  const showNetPrice = db.settings.priceDisplay.showNetPrice
  const accepted: CartLine[] = []
  const errors: FieldError[] = []
  const findProduct = (id: string) => db.products.find((product) => product.id === id)

  const lines = items.map((item, index): PricedLine => {
    const pieces: readonly (readonly [string, ProductGroup | undefined])[] =
      item.type === 'kit'
        ? [
            [item.mateId, 'mate'],
            [item.bombillaId, 'bombilla'],
            [item.yerbaId, 'yerba'],
          ]
        : [[item.productId, undefined]]
    const found = pieces.map(([id]) => findProduct(id))
    const products = pieces.map(([id, group]) => {
      const product = findProduct(id)
      return sellable(db, product, group) ? product : undefined
    })
    const first = found[0]
    const isMate = item.type === 'product' && first !== undefined && groupOf(db, first) === 'mate'
    const options = isMate ? item.options : undefined
    if (isMate && options === undefined && products[0] !== undefined) {
      errors.push({
        field: `items.${String(index)}.options`,
        code: 'required',
        message: 'Elegí el cuero y la virola del mate.',
      })
    }
    const base = {
      key: cartLineKey(toCartLine(item, options, item.quantity)),
      type: item.type,
      name: item.type === 'kit' ? KIT_NAME : (first?.name ?? MISSING_PRODUCT_NAME),
      detail:
        item.type === 'kit'
          ? `${found.map((product) => product?.name ?? MISSING_PRODUCT_NAME).join(' + ')} · ${leatherLabel(item.leather)}`
          : options === undefined
            ? ''
            : `${leatherLabel(options.leather)} · ${options.ferrule}`,
    }

    const missing = products.findIndex((product) => product === undefined)
    if (missing !== -1) {
      return {
        quote: blockedLine(base, 'unavailable', showNetPrice),
        amounts: null,
        orderLine: null,
        productId: pieces[missing]?.[0] ?? null,
        productName: found[missing]?.name ?? base.name,
      }
    }
    const sellableProducts = products.filter((product) => product !== undefined)
    const rooms = sellableProducts.map((product) =>
      remainingQuantityFor(product.id, availableStock(db, product, now), accepted),
    )
    const room = Math.min(...rooms)
    const limiting = sellableProducts[rooms.indexOf(room)]
    const limitingInfo = {
      productId: limiting?.id ?? null,
      productName: limiting?.name ?? base.name,
    }
    if (room === 0) {
      return {
        quote: blockedLine(base, 'sold_out', showNetPrice),
        amounts: null,
        orderLine: null,
        ...limitingInfo,
      }
    }

    const quantity = Math.min(item.quantity, room)
    const prices = sellableProducts.map((product) => pesos(product.priceArs))
    const [mate, bombilla, yerba] = prices
    const amounts =
      item.type === 'kit' && mate !== undefined && bombilla !== undefined && yerba !== undefined
        ? kitLineAmounts([mate, bombilla, yerba], quantity, kitDiscountPercent)
        : productLineAmounts(prices[0] ?? pesos(0), quantity)
    const unitPriceArs = sumPesos(prices)
    const priceChanged =
      item.expectedUnitPriceArs !== undefined && item.expectedUnitPriceArs !== unitPriceArs
    accepted.push(toCartLine(item, options, quantity))

    return {
      quote: {
        ...base,
        unitPriceArs,
        netUnitPriceArs: showNetPrice
          ? netPrice(pesos(amounts.totalArs / quantity), vatRatePercent)
          : null,
        kitSavingsArs: amounts.savingsArs,
        totalArs: amounts.totalArs,
        maxQuantity: room,
        issue:
          quantity < item.quantity ? 'quantity_reduced' : priceChanged ? 'price_changed' : null,
      },
      amounts,
      orderLine: {
        type: item.type,
        name: base.name,
        detail: base.detail,
        quantity,
        unitPriceArs,
        kitSavingsArs: amounts.savingsArs,
        totalArs: amounts.totalArs,
        productSlug: item.type === 'kit' ? null : (sellableProducts[0]?.slug ?? null),
        options:
          item.type === 'kit' ? { leather: item.leather, ferrule: KIT_FERRULE } : (options ?? null),
        kitItems:
          item.type === 'kit'
            ? sellableProducts.map((product) => ({
                slug: product.slug,
                name: product.name,
                unitPriceArs: product.priceArs,
              }))
            : null,
      },
      ...limitingInfo,
    }
  })

  if (errors.length > 0) throw new ResponseError(validationProblem(errors))
  const totals = cartTotals(
    lines.flatMap((line) => (line.amounts === null ? [] : [line.amounts])),
    null,
  )
  return {
    lines,
    quote: {
      lines: lines.map((line) => line.quote),
      itemsGrossArs: totals.itemsGrossArs,
      kitSavingsArs: totals.kitSavingsArs,
      subtotalArs: totals.subtotalArs,
      netSubtotalArs: showNetPrice ? netPrice(totals.subtotalArs, vatRatePercent) : null,
    },
    reservation: [...quantityByProduct(accepted)].map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
  }
}

/**
 * Avisos de las líneas que ya no se pueden comprar como se pidieron (sin stock, con menos stock o
 * dadas de baja), para el `409 stock_changed` de `POST /orders`.
 *
 * @param lines - Líneas cotizadas.
 */
export function stockChanges(lines: readonly PricedLine[]): ChangeNotice[] {
  return lines.flatMap(({ quote, productId, productName }): ChangeNotice[] => {
    switch (quote.issue) {
      case 'unavailable':
        return [
          { kind: 'unavailable', productId, message: `${productName} ya no está disponible.` },
        ]
      case 'sold_out':
        return [{ kind: 'stock', productId, message: `${productName} se agotó.` }]
      case 'quantity_reduced':
        return [
          {
            kind: 'stock',
            productId,
            message:
              quote.maxQuantity === 1
                ? `Queda 1 unidad de ${productName}.`
                : `Quedan ${String(quote.maxQuantity)} unidades de ${productName}.`,
          },
        ]
      default:
        return []
    }
  })
}

/**
 * Avisos de las líneas cuyo precio no es el que la tienda esperaba, para el `409 price_changed`.
 *
 * @param lines - Líneas cotizadas.
 */
export function priceChanges(lines: readonly PricedLine[]): ChangeNotice[] {
  return lines.flatMap(({ quote, productId }): ChangeNotice[] =>
    quote.issue === 'price_changed'
      ? [
          {
            kind: 'price',
            productId,
            message: `${quote.name} cambió de precio: ahora cuesta ${formatPesos(pesos(quote.unitPriceArs))}.`,
          },
        ]
      : [],
  )
}
