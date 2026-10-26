import { describe, expect, it } from 'vitest'
import type { CartLine } from '@galpon/domain'
import { cartHash } from './cart-hash'

const mateLine: CartLine = {
  type: 'product',
  productId: 'prd-imperial-premium',
  quantity: 1,
  options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
}
const yerbaLine: CartLine = { type: 'product', productId: 'prd-yerba-canarias', quantity: 2 }
const kitLine: CartLine = {
  type: 'kit',
  mateId: 'prd-imperial-premium',
  bombillaId: 'prd-bombillon-premium-curvo',
  yerbaId: 'prd-yerba-canarias',
  leather: 'Negro',
  quantity: 1,
}

describe('cartHash', () => {
  it('es estable: el mismo carrito da siempre el mismo valor, también tras copiarlo', () => {
    const lines = [mateLine, yerbaLine, kitLine]

    expect(cartHash(lines)).toBe(cartHash(lines))
    expect(cartHash(structuredClone(lines))).toBe(cartHash(lines))
    expect(cartHash(lines)).toMatch(/^[0-9a-f]{14}$/)
  })

  it('no cambia entre versiones: el checkout lo compara tras recargar', () => {
    expect(cartHash([yerbaLine])).toBe('17e5747dcb7428')
  })

  it('no depende del orden de las líneas', () => {
    expect(cartHash([mateLine, yerbaLine, kitLine])).toBe(cartHash([kitLine, mateLine, yerbaLine]))
  })

  it.each([
    ['cambia la cantidad', [mateLine, { ...yerbaLine, quantity: 3 }, kitLine]],
    ['quita una línea', [mateLine, yerbaLine]],
    ['suma una línea', [mateLine, yerbaLine, kitLine, { ...kitLine, leather: 'Marrón' as const }]],
    [
      'cambia el cuero de un mate',
      [
        { ...mateLine, options: { leather: 'Marrón', ferrule: 'Alpaca cincelada' } },
        yerbaLine,
        kitLine,
      ],
    ],
    ['cambia un producto del kit', [mateLine, yerbaLine, { ...kitLine, yerbaId: 'prd-otra' }]],
  ] satisfies [string, CartLine[]][])('cambia si %s', (_caso, lines) => {
    expect(cartHash(lines)).not.toBe(cartHash([mateLine, yerbaLine, kitLine]))
  })

  it('un carrito vacío tiene un valor propio y estable', () => {
    expect(cartHash([])).toBe(cartHash([]))
    expect(cartHash([])).not.toBe(cartHash([yerbaLine]))
  })

  it('rechaza una cantidad inválida', () => {
    expect(() => cartHash([{ ...yerbaLine, quantity: 0 }])).toThrow(RangeError)
    expect(() => cartHash([{ ...yerbaLine, quantity: 1.5 }])).toThrow(
      'La cantidad tiene que ser un entero mayor o igual a 1',
    )
  })
})
