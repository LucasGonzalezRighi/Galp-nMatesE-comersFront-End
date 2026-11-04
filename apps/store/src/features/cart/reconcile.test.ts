import { describe, expect, it } from 'vitest'
import type { CartLine } from '@galpon/domain'
import { describeCartNotices } from './cart-notices'
import { leatherChangedNotice } from './cart.copy'
import { EMPTY_SEEN, parseSeenValues, reconcileCart } from './reconcile'
import { comboItem, comboOf, summary } from './test/support'

const mate = summary({ id: 'm1', name: 'Mate Uno', group: 'mate', priceArs: 40000, maxQuantity: 5 })
const bombilla = summary({ id: 'b1', name: 'Bombilla Uno', group: 'bombilla', priceArs: 26000 })
const yerba = summary({ id: 'y1', name: 'Yerba Uno', group: 'yerba', priceArs: 10000 })

const mateLine: CartLine = {
  type: 'product',
  productId: 'm1',
  quantity: 2,
  options: { leather: 'Negro' },
}
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
          options: { leather: 'Negro' },
        },
        {
          type: 'product',
          productId: 'm1',
          quantity: 1,
          options: { leather: 'Crudo' },
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

describe('reconcileCart con combos', () => {
  /** "Dúo Imperial": el mate m1 (stock 5) y la bombilla b1, guardado con las piezas que tenía. */
  const duo = comboOf({
    id: 'cmb-duo',
    name: 'Dúo Imperial',
    items: [
      comboItem({ productId: 'm1', name: 'Mate Uno', maxQuantity: 5 }),
      comboItem({ productId: 'b1', name: 'Bombilla Uno', group: 'bombilla' }),
    ],
  })
  const comboLine: CartLine = {
    type: 'combo',
    comboId: 'cmb-duo',
    productIds: ['m1', 'b1'],
    options: { leather: 'Negro' },
    quantity: 1,
  }

  it('un combo que ya no viene en la lista de combos se quita y se avisa', () => {
    const result = reconcileCart({
      lines: [mateLine, comboLine],
      products: [mate, bombilla],
      combos: [],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([mateLine])
    expect(result.notices).toEqual([{ kind: 'removed', count: 1 }])
  })

  it('un combo que ya no se puede comprar (y no es por stock) se quita', () => {
    const result = reconcileCart({
      lines: [comboLine],
      products: [mate, bombilla],
      combos: [{ ...duo, isPurchasable: false }],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([])
    expect(result.notices).toEqual([{ kind: 'removed', count: 1 }])
  })

  it('un combo sin stock se queda, sin cambios ni avisos', () => {
    const soldOut = {
      ...duo,
      isPurchasable: false,
      isSoldOut: true,
      items: duo.items.map((item) => ({ ...item, maxQuantity: 0, isPurchasable: false })),
    }
    const result = reconcileCart({
      lines: [comboLine],
      products: [],
      combos: [soldOut],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([comboLine])
    expect(result.notices).toEqual([])
  })

  it('refresca las piezas del combo con las que informa la API', () => {
    const changed = {
      ...duo,
      items: [...duo.items, comboItem({ productId: 'y1', name: 'Yerba Uno', group: 'yerba' })],
    }
    const result = reconcileCart({
      lines: [comboLine],
      products: [mate, bombilla],
      combos: [changed],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([{ ...comboLine, productIds: ['m1', 'b1', 'y1'] }])
  })

  it('cambió el precio del combo: se avisa con su nombre y se recuerda el precio nuevo', () => {
    const first = reconcileCart({
      lines: [comboLine],
      products: [mate, bombilla],
      combos: [duo],
      seen: { prices: { 'cmb-duo': 59999 }, kitDiscountPercent: null },
      kitDiscountPercent: null,
    })
    expect(first.notices).toEqual([{ kind: 'price-changed', name: 'Dúo Imperial' }])
    expect(first.seen.prices).toEqual({ 'cmb-duo': 61999 })

    const second = reconcileCart({
      lines: first.lines,
      products: [mate, bombilla],
      combos: [duo],
      seen: first.seen,
      kitDiscountPercent: null,
    })
    expect(second.notices).toEqual([])
  })

  it('el combo comparte el stock con las líneas sueltas: se baja y se avisa con el nombre del combo', () => {
    const result = reconcileCart({
      lines: [
        { ...mateLine, quantity: 3 },
        { ...comboLine, quantity: 4 },
      ],
      products: [mate, bombilla],
      combos: [duo],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    // El mate tiene 5: 3 sueltos y quedan 2 para el combo.
    expect(result.lines[1]).toMatchObject({ type: 'combo', quantity: 2 })
    expect(result.notices).toEqual([{ kind: 'reduced', name: 'Dúo Imperial', quantity: 2 }])
  })

  it('sin la lista de combos (no se consultó), la línea de combo queda como estaba', () => {
    const result = reconcileCart({
      lines: [comboLine],
      products: [],
      seen: { prices: { 'cmb-duo': 61999 }, kitDiscountPercent: null },
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([comboLine])
    expect(result.seen.prices).toEqual({ 'cmb-duo': 61999 })
    expect(result.notices).toEqual([])
  })
})

describe('reconcileCart: cueros por producto (Ruling AT-5)', () => {
  /** El mate m1 ahora solo ofrece Marrón y Crudo. */
  const brownOrRaw = { ...mate, leathers: ['Marrón', 'Crudo'] } satisfies typeof mate
  /** El mate m1 ya no ofrece cueros. */
  const plain = { ...mate, leathers: [] } satisfies typeof mate
  const duo = comboOf({
    id: 'cmb-duo',
    name: 'Dúo Imperial',
    items: [
      comboItem({ productId: 'm1', name: 'Mate Uno', leathers: ['Marrón', 'Crudo'] }),
      comboItem({ productId: 'b1', name: 'Bombilla Uno', group: 'bombilla' }),
    ],
  })
  const comboLine: CartLine = {
    type: 'combo',
    comboId: 'cmb-duo',
    productIds: ['m1', 'b1'],
    options: { leather: 'Negro' },
    quantity: 1,
  }

  it('un mate suelto con un cuero que ya no se ofrece pasa al primero que se ofrece y avisa', () => {
    const result = reconcileCart({
      lines: [mateLine],
      products: [brownOrRaw],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([{ ...mateLine, options: { leather: 'Marrón' } }])
    expect(result.notices).toEqual([
      { kind: 'leather-changed', name: 'Mate Uno', leather: 'Marrón' },
    ])
    expect(describeCartNotices(result.notices)).toEqual({
      title: 'Actualizamos tu carrito',
      subtitle: 'Cambiamos el cuero de Mate Uno a marrón',
    })
  })

  it('un mate que ya no ofrece cueros pierde el cuero en silencio', () => {
    const result = reconcileCart({
      lines: [mateLine],
      products: [plain],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([{ type: 'product', productId: 'm1', quantity: 2 }])
    expect(result.notices).toEqual([])
  })

  it('un mate sin cuero que ahora ofrece cueros toma el inicial en silencio', () => {
    const result = reconcileCart({
      lines: [{ type: 'product', productId: 'm1', quantity: 2 }],
      products: [brownOrRaw],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([{ ...mateLine, options: { leather: 'Marrón' } }])
    expect(result.notices).toEqual([])
  })

  it('el kit toma los cueros de su mate y avisa con el nombre del mate', () => {
    const changed = reconcileCart({
      lines: [kitLine],
      products: [brownOrRaw, bombilla, yerba],
      seen: EMPTY_SEEN,
      kitDiscountPercent: 10,
    })
    expect(changed.lines).toEqual([{ ...kitLine, leather: 'Marrón' }])
    expect(changed.notices).toEqual([
      { kind: 'leather-changed', name: 'Mate Uno', leather: 'Marrón' },
    ])

    const removed = reconcileCart({
      lines: [kitLine],
      products: [plain, bombilla, yerba],
      seen: EMPTY_SEEN,
      kitDiscountPercent: 10,
    })
    expect(removed.lines).toEqual([{ ...kitLine, leather: null }])
    expect(removed.notices).toEqual([])

    const added = reconcileCart({
      lines: [{ ...kitLine, leather: null }],
      products: [brownOrRaw, bombilla, yerba],
      seen: EMPTY_SEEN,
      kitDiscountPercent: 10,
    })
    expect(added.lines).toEqual([{ ...kitLine, leather: 'Marrón' }])
    expect(added.notices).toEqual([])
  })

  it('el combo toma los cueros de su mate y avisa con el nombre del combo', () => {
    const changed = reconcileCart({
      lines: [comboLine],
      products: [],
      combos: [duo],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })
    expect(changed.lines).toEqual([{ ...comboLine, options: { leather: 'Marrón' } }])
    expect(changed.notices).toEqual([
      { kind: 'leather-changed', name: 'Dúo Imperial', leather: 'Marrón' },
    ])

    const withoutLeathers = {
      ...duo,
      items: duo.items.map((item) => ({ ...item, leathers: [] })),
    }
    const removed = reconcileCart({
      lines: [comboLine],
      products: [],
      combos: [withoutLeathers],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })
    expect(removed.lines).toEqual([
      { type: 'combo', comboId: 'cmb-duo', productIds: ['m1', 'b1'], quantity: 1 },
    ])
    expect(removed.notices).toEqual([])

    const added = reconcileCart({
      lines: [{ type: 'combo', comboId: 'cmb-duo', productIds: ['m1', 'b1'], quantity: 1 }],
      products: [],
      combos: [duo],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })
    expect(added.lines).toEqual([{ ...comboLine, options: { leather: 'Marrón' } }])
    expect(added.notices).toEqual([])
  })

  it('dos líneas del mismo mate que quedan con el mismo cuero se suman en una sola', () => {
    const result = reconcileCart({
      lines: [
        { ...mateLine, quantity: 2 },
        { ...mateLine, quantity: 1, options: { leather: 'Marrón' } },
      ],
      products: [brownOrRaw],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    expect(result.lines).toEqual([{ ...mateLine, quantity: 3, options: { leather: 'Marrón' } }])
    expect(result.notices).toEqual([
      { kind: 'leather-changed', name: 'Mate Uno', leather: 'Marrón' },
    ])
  })

  it('la suma de las líneas que se juntan respeta el stock', () => {
    const result = reconcileCart({
      lines: [
        { ...mateLine, quantity: 3 },
        { ...mateLine, quantity: 3, options: { leather: 'Marrón' } },
      ],
      products: [brownOrRaw],
      seen: EMPTY_SEEN,
      kitDiscountPercent: null,
    })

    // El mate tiene stock 5: 3 + 3 se baja a 5.
    expect(result.lines).toEqual([{ ...mateLine, quantity: 5, options: { leather: 'Marrón' } }])
    expect(result.notices).toEqual([
      { kind: 'reduced', name: 'Mate Uno', quantity: 5 },
      { kind: 'leather-changed', name: 'Mate Uno', leather: 'Marrón' },
    ])
  })

  it('una línea que se quita no cambia de cuero ni avisa', () => {
    const result = reconcileCart({
      lines: [kitLine],
      products: [brownOrRaw, bombilla],
      seen: EMPTY_SEEN,
      kitDiscountPercent: 10,
    })

    expect(result.lines).toEqual([])
    expect(result.notices).toEqual([{ kind: 'removed', count: 1 }])
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
  it('el aviso del cuero valida el nombre y el cuero', () => {
    expect(leatherChangedNotice('Mate Imperial Criollo', 'Marrón')).toBe(
      'Cambiamos el cuero de Mate Imperial Criollo a marrón',
    )
    expect(() => leatherChangedNotice(' ', 'Marrón')).toThrow(RangeError)
    expect(() => leatherChangedNotice('Mate', 'Rosa' as 'Negro')).toThrow(RangeError)
  })

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
