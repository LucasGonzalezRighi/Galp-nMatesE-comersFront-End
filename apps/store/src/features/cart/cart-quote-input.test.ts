import { describe, expect, it } from 'vitest'
import type { CartLine } from '@galpon/domain'
import { buildCartQuoteInput } from './cart-quote-input'

const mateLine: CartLine = {
  type: 'product',
  productId: 'm1',
  quantity: 2,
  options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
}
const yerbaLine: CartLine = { type: 'product', productId: 'y1', quantity: 1 }
const kitLine: CartLine = {
  type: 'kit',
  mateId: 'm1',
  bombillaId: 'b1',
  yerbaId: 'y1',
  leather: 'Marrón',
  quantity: 3,
}

describe('buildCartQuoteInput', () => {
  it('arma una línea por cada línea guardada, en el mismo orden', () => {
    expect(buildCartQuoteInput([kitLine, mateLine, yerbaLine])).toEqual({
      items: [
        {
          type: 'kit',
          mateId: 'm1',
          bombillaId: 'b1',
          yerbaId: 'y1',
          leather: 'Marrón',
          quantity: 3,
        },
        {
          type: 'product',
          productId: 'm1',
          quantity: 2,
          options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
        },
        // Lo que no es un mate no lleva opciones: el contrato pide `null`, no que falte.
        { type: 'product', productId: 'y1', quantity: 1, options: null },
      ],
    })
  })

  it('sin precios conocidos no manda expectedUnitPriceArs', () => {
    const { items } = buildCartQuoteInput([mateLine, kitLine])

    expect(items.every((item) => !('expectedUnitPriceArs' in item))).toBe(true)
  })

  it('manda el precio que el carrito ya tenía: el unitario del producto y la suma de las tres piezas del kit', () => {
    const input = buildCartQuoteInput([mateLine, yerbaLine, kitLine], {
      prices: { m1: 39999, b1: 25999, y1: 9999 },
    })

    expect(input.items.map((item) => item.expectedUnitPriceArs)).toEqual([39999, 9999, 75997])
  })

  it('si falta el precio de alguna pieza del kit, omite el campo de esa línea y sigue con las demás', () => {
    const input = buildCartQuoteInput([mateLine, kitLine], { prices: { m1: 39999, y1: 9999 } })

    expect(input.items.map((item) => item.expectedUnitPriceArs)).toEqual([39999, undefined])
    expect(input.items[1]).not.toHaveProperty('expectedUnitPriceArs')
  })

  it('ignora un precio que no es un entero de pesos', () => {
    const input = buildCartQuoteInput([yerbaLine, mateLine], { prices: { y1: -5, m1: 10.5 } })

    expect(input.items.map((item) => item.expectedUnitPriceArs)).toEqual([undefined, undefined])
  })

  it('un id como "constructor" no toma un precio heredado', () => {
    const input = buildCartQuoteInput(
      [{ type: 'product', productId: 'constructor', quantity: 1 }],
      {
        prices: {},
      },
    )

    expect(input.items[0]).not.toHaveProperty('expectedUnitPriceArs')
  })

  it('no modifica las líneas que recibe', () => {
    const lines = [mateLine, kitLine]
    const copy = structuredClone(lines)

    buildCartQuoteInput(lines, { prices: { m1: 1, b1: 2, y1: 3 } })

    expect(lines).toEqual(copy)
  })

  it('rechaza una cantidad inválida', () => {
    expect(() => buildCartQuoteInput([{ ...yerbaLine, quantity: 0 }])).toThrow(RangeError)
  })
})
