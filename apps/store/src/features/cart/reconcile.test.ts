import { describe, expect, it } from 'vitest'
import type { CartLine } from '@galpon/domain'
import { describeCartNotices } from './cart-notices'
import { EMPTY_SEEN, parseSeenValues, reconcileCart } from './reconcile'
import { summary } from './test/support'

const mate = summary({ id: 'm1', name: 'Mate Uno', group: 'mate', priceArs: 40000, maxQuantity: 5 })
const bombilla = summary({ id: 'b1', name: 'Bombilla Uno', group: 'bombilla', priceArs: 26000 })
const yerba = summary({ id: 'y1', name: 'Yerba Uno', group: 'yerba', priceArs: 10000 })

const mateLine: CartLine = { type: 'product', productId: 'm1', quantity: 2 }
const kitLine: CartLine = {
  type: 'kit',
  mateId: 'm1',
  bombillaId: 'b1',
  yerbaId: 'y1',
  leather: 'Negro',
  quantity: 1,
}

describe('reconcileCart (tabla de la spec 9.4)', () => {
  it('producto despublicado, archivado o inexistente: se quita la línea y se avisa', () => {
    // El catálogo no devuelve los productos que no están a la venta.
    const result = reconcileCart({
      lines: [mateLine, { type: 'product', productId: 'borrado', quantity: 1 }],
      products: [mate],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([mateLine])
    expect(result.notices).toEqual([{ kind: 'removed', count: 1 }])
  })

  it('un kit con una pieza que ya no está a la venta se quita entero', () => {
    const result = reconcileCart({
      lines: [kitLine],
      products: [mate, bombilla],
      seen: EMPTY_SEEN,
      kitDiscountPercent: 10,
    })

    expect(result.lines).toEqual([])
    expect(result.notices).toEqual([{ kind: 'removed', count: 1 }])
  })

  it('un producto que pasó a "a consultar" (sin precio) también se quita', () => {
    const result = reconcileCart({
      lines: [mateLine],
      products: [{ ...mate, priceArs: null, isPurchasable: false }],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([])
  })

  it('producto sin stock: la línea se queda, sin cambios ni avisos', () => {
    const result = reconcileCart({
      lines: [mateLine],
      products: [{ ...mate, maxQuantity: 0, isSoldOut: true, isPurchasable: false }],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([mateLine])
    expect(result.notices).toEqual([])
  })

  it('stock menor que la cantidad: se baja al máximo y se avisa', () => {
    const result = reconcileCart({
      lines: [{ ...mateLine, quantity: 4 }],
      products: [{ ...mate, maxQuantity: 3 }],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([{ ...mateLine, quantity: 3 }])
    expect(result.notices).toEqual([{ kind: 'reduced', name: 'Mate Uno', quantity: 3 }])
  })

  it('cambió el precio: se avisa una sola vez y se recuerda el valor nuevo', () => {
    const seen = { prices: { m1: 35000 }, kitDiscountPercent: null }

    const first = reconcileCart({
      lines: [mateLine],
      products: [mate],
      seen,
      kitDiscountPercent: null,
    })
    expect(first.notices).toEqual([{ kind: 'price-changed', name: 'Mate Uno' }])
    expect(first.seen.prices).toEqual({ m1: 40000 })

    const second = reconcileCart({
      lines: first.lines,
      products: [mate],
      seen: first.seen,
      kitDiscountPercent: null,
    })
    expect(second.notices).toEqual([])
  })

  it('cambió el descuento del kit: se avisa una sola vez', () => {
    const seen = { prices: { m1: 40000, b1: 26000, y1: 10000 }, kitDiscountPercent: 10 }

    const first = reconcileCart({
      lines: [kitLine],
      products: [mate, bombilla, yerba],
      seen,
      kitDiscountPercent: 15,
    })
    expect(first.notices).toEqual([{ kind: 'kit-discount-changed', percent: 15 }])
    expect(first.seen.kitDiscountPercent).toBe(15)

    const second = reconcileCart({
      lines: first.lines,
      products: [mate, bombilla, yerba],
      seen: first.seen,
      kitDiscountPercent: 15,
    })
    expect(second.notices).toEqual([])
  })

  it('lo que se ve por primera vez se recuerda sin avisar', () => {
    const result = reconcileCart({
      lines: [kitLine],
      products: [mate, bombilla, yerba],
      seen: EMPTY_SEEN,
      kitDiscountPercent: 10,
    })

    expect(result.notices).toEqual([])
    expect(result.seen).toEqual({
      prices: { m1: 40000, b1: 26000, y1: 10000 },
      kitDiscountPercent: 10,
    })
  })

  it('un carrito sano queda igual', () => {
    const lines: CartLine[] = [mateLine, kitLine]

    const result = reconcileCart({
      lines,
      products: [mate, bombilla, yerba],
      seen: EMPTY_SEEN,
      kitDiscountPercent: 10,
    })

    expect(result.lines).toEqual(lines)
    expect(result.notices).toEqual([])
  })
})

describe('reconcileCart: el stock vale para el producto en todas las líneas', () => {
  it('un mate suelto y el mismo mate en un kit comparten el stock', () => {
    const result = reconcileCart({
      lines: [
        { ...mateLine, quantity: 3 },
        { ...kitLine, quantity: 3 },
      ],
      products: [{ ...mate, maxQuantity: 5 }, bombilla, yerba],
      seen: EMPTY_SEEN,
      kitDiscountPercent: 10,
    })

    expect(result.lines).toEqual([
      { ...mateLine, quantity: 3 },
      { ...kitLine, quantity: 2 },
    ])
    expect(result.notices).toContainEqual({ kind: 'reduced', name: 'Mate Uno', quantity: 2 })
  })

  it('si las líneas anteriores ya usaron todo el stock, la última se quita', () => {
    const result = reconcileCart({
      lines: [
        {
          type: 'product',
          productId: 'm1',
          quantity: 2,
          options: { leather: 'Negro', ferrule: 'Acero' },
        },
        {
          type: 'product',
          productId: 'm1',
          quantity: 1,
          options: { leather: 'Crudo', ferrule: 'Acero' },
        },
      ],
      products: [{ ...mate, maxQuantity: 2 }],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toHaveLength(1)
    expect(result.notices).toEqual([{ kind: 'removed', count: 1 }])
  })

  it('una línea sin stock no le quita stock a las demás', () => {
    const sinStock = summary({ id: 'b1', group: 'bombilla', maxQuantity: 0, isSoldOut: true })

    const result = reconcileCart({
      lines: [kitLine, { ...mateLine, quantity: 5 }],
      products: [{ ...mate, maxQuantity: 5 }, sinStock, yerba],
      seen: EMPTY_SEEN,
      kitDiscountPercent: 10,
    })

    expect(result.lines).toEqual([kitLine, { ...mateLine, quantity: 5 }])
  })
})

describe('parseSeenValues', () => {
  it('lee lo guardado y descarta lo que no tiene la forma esperada', () => {
    expect(parseSeenValues({ prices: { a: 100 }, kitDiscountPercent: 10 })).toEqual({
      prices: { a: 100 },
      kitDiscountPercent: 10,
    })
    expect(parseSeenValues({ prices: { a: -1 }, kitDiscountPercent: 10 })).toEqual(EMPTY_SEEN)
    expect(parseSeenValues('basura')).toEqual(EMPTY_SEEN)
    expect(parseSeenValues(undefined)).toEqual(EMPTY_SEEN)
  })
})

describe('describeCartNotices', () => {
  it('no hay aviso sin cambios', () => {
    expect(describeCartNotices([])).toBeNull()
  })

  it('cuenta el primer cambio y suma cuántos más hubo', () => {
    expect(describeCartNotices([{ kind: 'removed', count: 1 }])).toEqual({
      title: 'Actualizamos tu carrito',
      subtitle: 'Quitamos un producto que ya no está disponible',
    })
    expect(
      describeCartNotices([
        { kind: 'reduced', name: 'Mate Uno', quantity: 2 },
        { kind: 'price-changed', name: 'Yerba' },
        { kind: 'kit-discount-changed', percent: 15 },
      ]),
    ).toEqual({
      title: 'Actualizamos tu carrito',
      subtitle: 'Mate Uno: bajamos la cantidad a 2 por el stock · y 2 cambios más',
    })
  })
})
