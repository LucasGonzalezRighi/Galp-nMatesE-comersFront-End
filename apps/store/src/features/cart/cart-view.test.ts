import { describe, expect, it } from 'vitest'
import type { CartLine } from '@galpon/domain'
import { parseCartLines } from './cart-lines'
import { buildCartView } from './cart-view'
import { cartQuote, quoteLine, summary } from './test/support'

const mate = summary({ id: 'm1', name: 'Mate Imperial Premium', priceArs: 39999 })
const bombilla = summary({
  id: 'b1',
  name: 'Bombillón Premium Curvo',
  group: 'bombilla',
  priceArs: 25999,
})
const yerba = summary({ id: 'y1', name: 'Yerba Canarias 1 kg', group: 'yerba', priceArs: 9999 })

const mateLine: CartLine = {
  type: 'product',
  productId: 'm1',
  quantity: 1,
  options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
}
const kitLine: CartLine = {
  type: 'kit',
  mateId: 'm1',
  bombillaId: 'b1',
  yerbaId: 'y1',
  leather: 'Negro',
  quantity: 1,
}

const mateKey = 'product:m1:Negro:Alpaca cincelada'
const kitKey = 'kit:m1:b1:y1:Negro'

/** Cotización de la captura del diseño: un mate y un kit con 10 % de descuento. */
const mateQuoteLine = quoteLine({
  key: mateKey,
  name: 'Mate Imperial Premium',
  detail: 'Cuero negro · Alpaca cincelada',
  unitPriceArs: 39999,
  totalArs: 39999,
  netUnitPriceArs: 33057,
})
const kitQuoteLine = quoteLine({
  key: kitKey,
  type: 'kit',
  name: 'Kit',
  detail: 'Mate Imperial Premium + Bombillón Premium Curvo + Yerba Canarias 1 kg · Cuero negro',
  unitPriceArs: 75997,
  kitSavingsArs: 7600,
  totalArs: 68397,
  netUnitPriceArs: 56526,
})
const quote = cartQuote([mateQuoteLine, kitQuoteLine], {
  itemsGrossArs: 115996,
  netSubtotalArs: 89583,
})

describe('buildCartView', () => {
  it('muestra los importes de la cotización tal como vienen (como la captura del diseño)', () => {
    const view = buildCartView({ lines: [mateLine, kitLine], quote })

    const [productLine, kit] = view.lines
    expect(productLine).toMatchObject({
      name: 'Mate Imperial Premium',
      detail: 'Cuero negro · Alpaca cincelada',
      status: 'ready',
      issue: null,
      totalArs: 39999,
      kitSavingsArs: 0,
    })
    // El kit usa el nombre del diseño y el detalle que arma la API.
    expect(kit).toMatchObject({
      name: 'Kit ronda completa',
      detail: 'Mate Imperial Premium + Bombillón Premium Curvo + Yerba Canarias 1 kg · Cuero negro',
      status: 'ready',
      totalArs: 68397,
      kitSavingsArs: 7600,
    })
    expect(view.totals).toEqual({
      itemsGrossArs: 115996,
      kitSavingsArs: 7600,
      subtotalArs: 108396,
      netSubtotalArs: 89583,
    })
    expect(view.count).toBe(2)
    expect(view.canCheckout).toBe(true)
  })

  it('el precio sin impuestos nacionales por unidad llega también en el kit; apagado, no hay ninguno', () => {
    const on = buildCartView({ lines: [mateLine, kitLine], quote })
    const off = buildCartView({
      lines: [mateLine, kitLine],
      quote: cartQuote(
        [
          { ...mateQuoteLine, netUnitPriceArs: null },
          { ...kitQuoteLine, netUnitPriceArs: null },
        ],
        { itemsGrossArs: 115996 },
      ),
    })

    expect(on.lines.map((line) => line.netUnitPriceArs)).toEqual([33057, 56526])
    expect(off.lines.map((line) => line.netUnitPriceArs)).toEqual([null, null])
    expect(off.totals.netSubtotalArs).toBeNull()
  })

  it('los dos netos se muestran como vienen aunque la suma por unidad difiera unos pesos del neto del subtotal', () => {
    const two = quoteLine({
      key: mateKey,
      totalArs: 20000,
      unitPriceArs: 10000,
      netUnitPriceArs: 8264,
    })
    const view = buildCartView({
      lines: [{ ...mateLine, quantity: 2 }],
      quote: cartQuote([two], { netSubtotalArs: 16529 }),
    })

    // 8.264 × 2 = 16.528, pero el back calcula el neto del subtotal sobre el total: 16.529.
    expect(view.lines[0]?.netUnitPriceArs).toBe(8264)
    expect(view.totals.netSubtotalArs).toBe(16529)
  })

  it.each(['sold_out', 'unavailable'] as const)(
    'una línea "%s" no suma, no muestra importes ni neto en $0 y bloquea la compra',
    (issue) => {
      const blocked = quoteLine({
        key: mateKey,
        issue,
        unitPriceArs: 0,
        totalArs: 0,
        netUnitPriceArs: 0,
        maxQuantity: 0,
      })
      const view = buildCartView({
        lines: [mateLine, kitLine],
        quote: cartQuote([blocked, kitQuoteLine], { netSubtotalArs: 56526 }),
      })

      expect(view.lines[0]).toMatchObject({
        status: 'sold-out',
        issue,
        totalArs: null,
        netUnitPriceArs: null,
        notice: null,
      })
      expect(view.lines[1]?.status).toBe('ready')
      expect(view.totals.subtotalArs).toBe(68397)
      expect(view.canCheckout).toBe(false)
    },
  )

  it('con todo bloqueado el subtotal es $0 y no se muestra un neto en $0', () => {
    const blocked = quoteLine({
      key: mateKey,
      issue: 'sold_out',
      unitPriceArs: 0,
      totalArs: 0,
      netUnitPriceArs: 0,
      maxQuantity: 0,
    })

    const view = buildCartView({
      lines: [mateLine],
      quote: cartQuote([blocked], { netSubtotalArs: 0 }),
    })

    expect(view.totals.subtotalArs).toBe(0)
    expect(view.totals.netSubtotalArs).toBeNull()
  })

  it('"quantity_reduced": la línea se muestra con las unidades cotizadas y avisa del stock', () => {
    const reduced = quoteLine({
      key: mateKey,
      name: 'Mate Imperial Premium',
      issue: 'quantity_reduced',
      maxQuantity: 2,
      unitPriceArs: 10000,
      totalArs: 20000,
    })

    const view = buildCartView({
      lines: [{ ...mateLine, quantity: 5 }],
      quote: cartQuote([reduced]),
    })

    expect(view.lines[0]).toMatchObject({
      status: 'ready',
      issue: 'quantity_reduced',
      quantity: 2,
      maxQuantity: 2,
      totalArs: 20000,
      notice: 'Mate Imperial Premium: bajamos la cantidad a 2 por el stock',
    })
    expect(view.canCheckout).toBe(true)
  })

  it('"price_changed": la línea muestra el importe vigente y avisa del cambio de precio', () => {
    const changed = quoteLine({ ...mateQuoteLine, issue: 'price_changed' })

    const view = buildCartView({ lines: [mateLine], quote: cartQuote([changed]) })

    expect(view.lines[0]).toMatchObject({
      status: 'ready',
      issue: 'price_changed',
      totalArs: 39999,
      notice: 'Cambió el precio de Mate Imperial Premium',
    })
  })

  it('sin cotización las líneas están "loading" y no se puede finalizar', () => {
    const view = buildCartView({ lines: [mateLine, kitLine], quote: null })

    expect(view.lines.map((line) => line.status)).toEqual(['loading', 'loading'])
    expect(view.lines[0]?.name).toBe('Cargando…')
    expect(view.lines[0]).toMatchObject({ totalArs: null, netUnitPriceArs: null, notice: null })
    expect(view.totals).toEqual({
      itemsGrossArs: 0,
      kitSavingsArs: 0,
      subtotalArs: 0,
      netSubtotalArs: null,
    })
    expect(view.canCheckout).toBe(false)
    expect(view.count).toBe(2)
  })

  it('una línea que la cotización todavía no trae (la sumaron después) está "loading"', () => {
    const view = buildCartView({
      lines: [mateLine, { type: 'product', productId: 'y1', quantity: 1 }],
      quote: cartQuote([mateQuoteLine]),
    })

    expect(view.lines.map((line) => line.status)).toEqual(['ready', 'loading'])
    expect(view.canCheckout).toBe(false)
  })

  it('un carrito vacío no se puede finalizar', () => {
    const view = buildCartView({ lines: [], quote: cartQuote([]) })

    expect(view.canCheckout).toBe(false)
    expect(view.totals.subtotalArs).toBe(0)
  })

  it('la foto sale del catálogo si se conoce; si no, la línea no tiene foto', () => {
    const photo = { url: '/m1.jpg', alt: 'Mate', publicId: 'm1', width: 800, height: 1000 }
    const withPhoto = { ...mate, mainImage: photo }
    const lines = [mateLine, kitLine]

    const known = buildCartView({ lines, quote, products: [withPhoto, bombilla, yerba] })
    const unknown = buildCartView({ lines, quote })

    expect(known.lines.map((line) => line.image)).toEqual([{ url: '/m1.jpg', alt: 'Mate' }, null])
    expect(unknown.lines.map((line) => line.image)).toEqual([null, null])
  })

  it('el máximo de cada línea cuenta el producto en todas las líneas', () => {
    const lines: CartLine[] = [
      { ...mateLine, quantity: 2 },
      { ...kitLine, quantity: 1 },
    ]
    const quoted = cartQuote([
      { ...mateQuoteLine, maxQuantity: 5 },
      { ...kitQuoteLine, maxQuantity: 5 },
    ])

    const view = buildCartView({
      lines,
      quote: quoted,
      products: [{ ...mate, maxQuantity: 5 }, bombilla, yerba],
    })

    // El mate ya está 3 veces (2 sueltos y 1 en el kit): quedan 2 de 5.
    expect(view.lines[0]?.maxQuantity).toBe(4)
    expect(view.lines[1]?.maxQuantity).toBe(3)
  })

  it('sin el catálogo, el máximo de cada línea es el que informa la cotización', () => {
    const view = buildCartView({
      lines: [mateLine],
      quote: cartQuote([{ ...mateQuoteLine, maxQuantity: 7 }]),
    })

    expect(view.lines[0]?.maxQuantity).toBe(7)
  })
})

describe('parseCartLines', () => {
  it('lee líneas válidas y suma las repetidas', () => {
    expect(parseCartLines([mateLine, mateLine, kitLine])).toEqual([
      { ...mateLine, quantity: 2 },
      kitLine,
    ])
  })

  it.each([
    ['no es una lista', { type: 'product' }],
    ['la cantidad supera el tope', [{ ...mateLine, quantity: 21 }]],
    ['la cantidad es decimal', [{ ...mateLine, quantity: 1.5 }]],
    ['el cuero no existe', [{ ...mateLine, options: { leather: 'Rosa', ferrule: 'Acero' } }]],
    ['el tipo no existe', [{ type: 'regalo', quantity: 1 }]],
    ['es basura', ['x', 1, null]],
  ])('descarta lo inválido: %s', (_motivo, value) => {
    expect(parseCartLines(value)).toEqual([])
  })

  it('una línea mala no vacía el carrito', () => {
    expect(parseCartLines([{ type: 'regalo' }, mateLine])).toEqual([mateLine])
  })

  it('lee como máximo 50 líneas', () => {
    const many = Array.from({ length: 80 }, (_, index) => ({
      type: 'product',
      productId: `p${String(index)}`,
      quantity: 1,
    }))

    expect(parseCartLines(many)).toHaveLength(50)
  })
})
