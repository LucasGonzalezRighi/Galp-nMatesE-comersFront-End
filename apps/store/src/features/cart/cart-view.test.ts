import { describe, expect, it } from 'vitest'
import type { CartLine } from '@galpon/domain'
import { parseCartLines } from './cart-lines'
import { buildCartView } from './cart-view'
import { summary } from './test/support'

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

describe('buildCartView', () => {
  it('calcula importes, ahorro por kit y subtotal con las reglas de domain (como la captura del diseño)', () => {
    const view = buildCartView({
      lines: [mateLine, kitLine],
      products: [mate, bombilla, yerba],
      kitDiscountPercent: 10,
    })

    const [productLine, kit] = view.lines
    expect(productLine).toMatchObject({
      name: 'Mate Imperial Premium',
      detail: 'Cuero negro · Alpaca cincelada',
      status: 'ready',
    })
    expect(productLine?.amounts).toEqual({ grossArs: 39999, savingsArs: 0, totalArs: 39999 })
    expect(kit).toMatchObject({
      name: 'Kit ronda completa',
      detail: 'Mate Imperial Premium + Bombillón Premium Curvo + Yerba Canarias 1 kg · Cuero negro',
      status: 'ready',
    })
    expect(kit?.amounts).toEqual({ grossArs: 75997, savingsArs: 7600, totalArs: 68397 })
    expect(view.totals).toMatchObject({
      itemsGrossArs: 115996,
      kitSavingsArs: 7600,
      subtotalArs: 108396,
    })
    expect(view.count).toBe(2)
    expect(view.canCheckout).toBe(true)
  })

  it('una línea sin stock no suma al total y bloquea la compra', () => {
    const view = buildCartView({
      lines: [mateLine, kitLine],
      products: [
        { ...mate, maxQuantity: 0, isSoldOut: true, isPurchasable: false },
        bombilla,
        yerba,
      ],
      kitDiscountPercent: 10,
    })

    expect(view.lines.map((line) => line.status)).toEqual(['sold-out', 'sold-out'])
    expect(view.totals.subtotalArs).toBe(0)
    expect(view.canCheckout).toBe(false)
  })

  it('con los datos sin llegar las líneas están "loading" y no se puede finalizar', () => {
    const view = buildCartView({
      lines: [mateLine, kitLine],
      products: [],
      kitDiscountPercent: null,
    })

    expect(view.lines.map((line) => line.status)).toEqual(['loading', 'loading'])
    expect(view.lines[0]?.name).toBe('Cargando…')
    expect(view.canCheckout).toBe(false)
    expect(view.count).toBe(2)
  })

  it('un kit espera el descuento aunque ya estén sus tres productos', () => {
    const view = buildCartView({
      lines: [kitLine],
      products: [mate, bombilla, yerba],
      kitDiscountPercent: null,
    })

    expect(view.lines[0]?.status).toBe('loading')
  })

  it('un carrito vacío no se puede finalizar', () => {
    const view = buildCartView({ lines: [], products: [], kitDiscountPercent: 10 })

    expect(view.canCheckout).toBe(false)
    expect(view.totals.subtotalArs).toBe(0)
  })

  it('el máximo de cada línea cuenta el producto en todas las líneas', () => {
    const view = buildCartView({
      lines: [
        { ...mateLine, quantity: 2 },
        { ...kitLine, quantity: 1 },
      ],
      products: [{ ...mate, maxQuantity: 5 }, bombilla, yerba],
      kitDiscountPercent: 10,
    })

    // El mate ya está 3 veces (2 sueltos y 1 en el kit): quedan 2 de 5.
    expect(view.lines[0]?.maxQuantity).toBe(4)
    expect(view.lines[1]?.maxQuantity).toBe(3)
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
