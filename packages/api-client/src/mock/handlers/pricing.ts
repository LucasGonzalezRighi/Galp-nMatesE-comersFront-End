import { z } from 'zod'
import type { CartLine, Leather, LineAmounts, ProductGroup } from '@galpon/domain'
import {
  cartLineKey,
  cartTotals,
  comboLineAmounts,
  comboLineKey,
  comboMateLeathers,
  formatPesos,
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

/** Nombre de una línea cuyo combo ya no existe. */
const MISSING_COMBO_NAME = 'Combo no disponible'

/** Error de un mate que ofrece cueros (suelto, en un kit o en un combo) y llega sin cuero. */
const MISSING_LEATHER_MESSAGE = 'Elegí el cuero del mate.'

/** Error de un mate que llega con un cuero que no ofrece. */
const LEATHER_NOT_OFFERED_MESSAGE = 'Ese cuero no está disponible para este mate.'

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
 * si viene, una diferencia se avisa con `price_changed`. Un producto suelto y un combo (su precio
 * final) usan el tope de `Pesos` y un kit el de `TotalArs` (suma de las tres piezas), como en el
 * contrato.
 */
const expectedPesosSchema = z.int().min(0).max(99_999_999).optional()
const expectedTotalSchema = z.int().min(0).max(2_147_483_647).optional()

/** Cuero elegido de un mate (`CartItemOptions`). */
const optionsSchema = z.object({ leather: z.enum(LEATHERS) })

/** Línea del carrito como la manda la tienda (los `null` ya quitados). */
const cartItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('product'),
    productId: idSchema,
    quantity: quantitySchema,
    options: optionsSchema.optional(),
    expectedUnitPriceArs: expectedPesosSchema,
  }),
  z.object({
    type: z.literal('kit'),
    mateId: idSchema,
    bombillaId: idSchema,
    yerbaId: idSchema,
    // El `null` del contrato llega quitado: sin cuero es `null`.
    leather: z
      .enum(LEATHERS)
      .optional()
      .transform((leather) => leather ?? null),
    quantity: quantitySchema,
    expectedUnitPriceArs: expectedTotalSchema,
  }),
  z.object({
    type: z.literal('combo'),
    comboId: idSchema,
    quantity: quantitySchema,
    options: optionsSchema.optional(),
    expectedUnitPriceArs: expectedPesosSchema,
  }),
])

/** Líneas del carrito: de 1 a 50, como en el contrato. */
export const cartItemsSchema = z
  .array(cartItemSchema)
  .min(1, 'Agregá al menos un producto.')
  .max(50, 'El carrito puede tener hasta 50 líneas.')

/** Línea del carrito ya validada. */
export type CartItem = z.output<typeof cartItemSchema>

/** Línea de combo ya validada. */
type ComboItem = Extract<CartItem, { type: 'combo' }>

/** Línea de un producto suelto o de un kit ya validada. */
type ProductOrKitItem = Exclude<CartItem, { type: 'combo' }>

/** Línea cotizada, con lo que hace falta para armar el pedido y los avisos de cambios. */
export interface PricedLine {
  /** La línea como se devuelve en la cotización. */
  quote: CartQuoteLine
  /** Importes de la línea, o `null` si no se puede comprar. */
  amounts: LineAmounts | null
  /** La línea del pedido, o `null` si no se puede comprar. */
  orderLine: OrderLine | null
  /**
   * Producto que explica el problema de la línea (la pieza agotada de un kit o de un combo), o
   * `null` si el problema no es de un producto (un combo dado de baja o con otro precio).
   */
  productId: string | null
  /** Nombre del producto (o del combo) que explica el problema, para los avisos. */
  productName: string
  /**
   * Precio por unidad que se compara con `expectedUnitPriceArs` y que nombra el aviso de cambio de
   * precio: el de lista en un producto o un kit y el precio final en un combo; 0 si la línea no se
   * puede comprar.
   */
  quotedPriceArs: number
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

/**
 * Grupo de un producto según su línea.
 *
 * @param db - Base simulada.
 * @param product - Producto.
 * @returns El grupo, o `undefined` si la línea del producto no existe.
 */
export function groupOf(db: MockDb, product: MockProduct): ProductGroup | undefined {
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

/**
 * Cuero que vale para una línea: el que mandó la tienda si el mate lo ofrece.
 *
 * @param sent - Cuero que mandó la tienda, o `null`.
 * @param offered - Cueros que ofrece el mate (vacío si no es un mate o no tiene selector).
 * @returns `sent` si está en `offered`; si no, `null` (sin cueros, el que llegue se ignora).
 */
function offeredLeather(sent: Leather | null, offered: readonly Leather[]): Leather | null {
  return sent !== null && offered.includes(sent) ? sent : null
}

/**
 * Error del cuero de una línea, con las reglas de `quoteCart` del contrato.
 *
 * @param sent - Cuero que mandó la tienda, o `null`.
 * @param offered - Cueros que ofrece el mate.
 * @param fields - Campo del error si falta el cuero y si no se ofrece.
 * @returns El error, o `null` si el mate no ofrece cueros o el cuero es uno de los suyos.
 */
function leatherError(
  sent: Leather | null,
  offered: readonly Leather[],
  fields: { missing: string; notOffered: string },
): FieldError | null {
  if (offered.length === 0) return null
  if (sent === null) {
    return { field: fields.missing, code: 'required', message: MISSING_LEATHER_MESSAGE }
  }
  if (!offered.includes(sent)) {
    return {
      field: fields.notOffered,
      code: 'leather_not_offered',
      message: LEATHER_NOT_OFFERED_MESSAGE,
    }
  }
  return null
}

/**
 * Línea del carrito del dominio, con la cantidad indicada y el cuero que mandó la tienda (así la
 * clave repite lo que mandó).
 */
function toCartLine(item: ProductOrKitItem, quantity: number): CartLine {
  if (item.type === 'kit') {
    const { mateId, bombillaId, yerbaId, leather } = item
    return { type: 'kit', mateId, bombillaId, yerbaId, leather, quantity }
  }
  return {
    type: 'product',
    productId: item.productId,
    quantity,
    ...(item.options === undefined ? {} : { options: item.options }),
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

/** Lo que comparte la cotización de cada línea: el stock ya tomado y los errores por campo. */
interface PricingState {
  /** Líneas ya aceptadas (las piezas de un combo entran como productos sueltos), en orden. */
  accepted: CartLine[]
  /** Errores por campo que hacen fallar la cotización con `422`. */
  errors: FieldError[]
  /** Momento del pedido (para no vender stock reservado). */
  now: Date
}

/**
 * Cotiza una línea de combo con las reglas de `ComboCartItemInput` del contrato: combo dado de
 * baja o con una pieza que no se vende, `unavailable`; mate con cueros sin cuero, error en
 * `items.N.options`, y con un cuero que no ofrece, en `items.N.options.leather`; stock
 * compartido con las demás líneas; importes de `comboLineAmounts` y `price_changed` contra el
 * precio del combo.
 *
 * @param db - Base simulada.
 * @param item - Línea de combo validada.
 * @param index - Lugar de la línea en el carrito, para el error por campo.
 * @param state - Stock ya tomado y errores de la cotización (se modifican).
 */
function priceComboItem(
  db: MockDb,
  item: ComboItem,
  index: number,
  state: PricingState,
): PricedLine {
  const { vatRatePercent } = db.settings
  const showNetPrice = db.settings.priceDisplay.showNetPrice
  const combo = db.combos.find((candidate) => candidate.id === item.comboId)
  const found = (combo?.productIds ?? []).map((id) =>
    db.products.find((product) => product.id === id),
  )
  const offered = comboMateLeathers(
    found.flatMap((product) => {
      const group = product === undefined ? undefined : groupOf(db, product)
      return product === undefined || group === undefined
        ? []
        : [{ group, leathers: product.leathers }]
    }),
  )
  const sent = item.options?.leather ?? null
  const leather = offeredLeather(sent, offered)
  const name = combo?.name ?? MISSING_COMBO_NAME
  const pieceNames = found.map((product) => product?.name ?? MISSING_PRODUCT_NAME).join(' + ')
  const base = {
    // La clave repite lo que mandó la tienda, ofrezca o no cueros el mate.
    key: comboLineKey(item.comboId, item.options ?? null),
    type: 'combo' as const,
    name,
    detail:
      leather === null || pieceNames === ''
        ? pieceNames
        : `${pieceNames} · ${leatherLabel(leather)}`,
  }
  const blocked = (issue: 'sold_out' | 'unavailable', productId: string | null): PricedLine => ({
    quote: blockedLine(base, issue, showNetPrice),
    amounts: null,
    orderLine: null,
    productId,
    productName: name,
    quotedPriceArs: 0,
  })

  if (combo?.status !== 'published') return blocked('unavailable', null)
  const missing = found.findIndex((product) => !sellable(db, product, undefined))
  if (missing !== -1) return blocked('unavailable', combo.productIds[missing] ?? null)
  const pieces = found.filter((product): product is MockProduct & { priceArs: number } =>
    sellable(db, product, undefined),
  )
  const error = leatherError(sent, offered, {
    missing: `items.${String(index)}.options`,
    notOffered: `items.${String(index)}.options.leather`,
  })
  if (error !== null) state.errors.push(error)

  const rooms = pieces.map((product) =>
    remainingQuantityFor(product.id, availableStock(db, product, state.now), state.accepted),
  )
  const room = Math.min(...rooms)
  const limiting = pieces[rooms.indexOf(room)]
  if (room === 0) return blocked('sold_out', limiting?.id ?? null)

  const quantity = Math.min(item.quantity, room)
  const priceArs = pesos(combo.priceArs)
  const amounts = comboLineAmounts(
    pieces.map((product) => pesos(product.priceArs)),
    priceArs,
    quantity,
  )
  const unitPriceArs = amounts.grossArs / quantity
  const reduced = quantity < item.quantity
  const priceChanged =
    item.expectedUnitPriceArs !== undefined && item.expectedUnitPriceArs !== combo.priceArs
  for (const product of pieces) {
    state.accepted.push({ type: 'product', productId: product.id, quantity })
  }

  return {
    quote: {
      ...base,
      unitPriceArs,
      netUnitPriceArs: showNetPrice ? netPrice(priceArs, vatRatePercent) : null,
      kitSavingsArs: amounts.savingsArs,
      totalArs: amounts.totalArs,
      maxQuantity: room,
      issue: reduced ? 'quantity_reduced' : priceChanged ? 'price_changed' : null,
    },
    amounts,
    orderLine: {
      type: 'combo',
      name,
      detail: base.detail,
      quantity,
      unitPriceArs,
      kitSavingsArs: amounts.savingsArs,
      totalArs: amounts.totalArs,
      productSlug: null,
      options: leather === null ? null : { leather },
      kitItems: pieces.map((product) => ({
        slug: product.slug,
        name: product.name,
        unitPriceArs: product.priceArs,
      })),
    },
    productId: reduced ? (limiting?.id ?? null) : null,
    productName: name,
    quotedPriceArs: combo.priceArs,
  }
}

/**
 * Cotiza el carrito con los precios, el descuento del kit y el stock disponible de la base.
 *
 * Usa las reglas de `@galpon/domain`: el tope por producto vale para todas las líneas (sueltas y
 * dentro de kits y combos), en orden, y los importes salen de `productLineAmounts`,
 * `kitLineAmounts`, `comboLineAmounts` y `cartTotals`. Una línea con problemas no hace fallar
 * la cotización: se informa en `issue`.
 *
 * @param db - Base simulada.
 * @param items - Líneas del carrito, ya validadas con {@link cartItemsSchema}.
 * @param now - Momento del pedido (para no vender stock reservado).
 * @returns La cotización, los datos de cada línea y lo que se reservaría.
 * @throws {ResponseError} Con `422` si un mate que ofrece cueros (suelto, en un kit o en un combo)
 *   llega sin cuero o con uno que no ofrece.
 */
export function priceCart(db: MockDb, items: readonly CartItem[], now: Date): PricedCart {
  const { kitDiscountPercent, vatRatePercent } = db.settings
  const showNetPrice = db.settings.priceDisplay.showNetPrice
  const accepted: CartLine[] = []
  const errors: FieldError[] = []
  const findProduct = (id: string) => db.products.find((product) => product.id === id)

  const lines = items.map((item, index): PricedLine => {
    if (item.type === 'combo') return priceComboItem(db, item, index, { accepted, errors, now })
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
    // El producto suelto o el mate del kit: sus cueros son los que se pueden elegir.
    const first = found[0]
    const offered = first?.leathers ?? []
    const sent = item.type === 'kit' ? item.leather : (item.options?.leather ?? null)
    const leather = offeredLeather(sent, offered)
    const leatherText = leather === null ? '' : leatherLabel(leather)
    const pieceNames = found.map((product) => product?.name ?? MISSING_PRODUCT_NAME).join(' + ')
    const base = {
      // La clave repite lo que mandó la tienda, ofrezca o no cueros el producto.
      key: cartLineKey(toCartLine(item, item.quantity)),
      type: item.type,
      name: item.type === 'kit' ? KIT_NAME : (first?.name ?? MISSING_PRODUCT_NAME),
      detail:
        item.type === 'kit'
          ? leather === null
            ? pieceNames
            : `${pieceNames} · ${leatherText}`
          : leatherText,
    }

    const missing = products.findIndex((product) => product === undefined)
    if (missing === -1) {
      // Sin error de cuero en una línea que no se vende (`unavailable`).
      const field =
        item.type === 'kit' ? `items.${String(index)}.leather` : `items.${String(index)}.options`
      const error = leatherError(sent, offered, {
        missing: field,
        notOffered: item.type === 'kit' ? field : `${field}.leather`,
      })
      if (error !== null) errors.push(error)
    } else {
      return {
        quote: blockedLine(base, 'unavailable', showNetPrice),
        amounts: null,
        orderLine: null,
        productId: pieces[missing]?.[0] ?? null,
        productName: found[missing]?.name ?? base.name,
        quotedPriceArs: 0,
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
        quotedPriceArs: 0,
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
    accepted.push(toCartLine(item, quantity))

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
        options: leather === null ? null : { leather },
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
      quotedPriceArs: unitPriceArs,
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
  return lines.flatMap(({ quote, productId, quotedPriceArs }): ChangeNotice[] =>
    quote.issue === 'price_changed'
      ? [
          {
            kind: 'price',
            productId,
            message: `${quote.name} cambió de precio: ahora cuesta ${formatPesos(pesos(quotedPriceArs))}.`,
          },
        ]
      : [],
  )
}
