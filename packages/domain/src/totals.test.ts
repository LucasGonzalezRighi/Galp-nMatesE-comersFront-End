import { describe, expect, it } from 'vitest'
import { pesos } from './money'
import { cartTotals, kitLineAmounts, productLineAmounts } from './totals'

/** Piezas del ejemplo del spec: mate $39.999, bombilla $25.999, yerba $9.999. */
const KIT_PIECES = [pesos(39999), pesos(25999), pesos(9999)] as const

describe('productLineAmounts', () => {
  it('multiplica el precio por la cantidad y no tiene ahorro', () => {
    expect(productLineAmounts(pesos(39999), 2)).toEqual({
      grossArs: 79998,
      savingsArs: 0,
      totalArs: 79998,
    })
  })
  it('con cantidad 0 todo es 0', () => {
    expect(productLineAmounts(pesos(39999), 0)).toEqual({
      grossArs: 0,
      savingsArs: 0,
      totalArs: 0,
    })
  })
})

describe('kitLineAmounts', () => {
  it('un kit con 10%: bruto $75.997, ahorro $7.600, total $68.397', () => {
    expect(kitLineAmounts(KIT_PIECES, 1, 10)).toEqual({
      grossArs: 75997,
      savingsArs: 7600,
      totalArs: 68397,
    })
  })
  it('dos kits: todo se duplica', () => {
    expect(kitLineAmounts(KIT_PIECES, 2, 10)).toEqual({
      grossArs: 151994,
      savingsArs: 15200,
      totalArs: 136794,
    })
  })
  it('con 0% el total es el bruto', () => {
    expect(kitLineAmounts(KIT_PIECES, 1, 0)).toEqual({
      grossArs: 75997,
      savingsArs: 0,
      totalArs: 75997,
    })
  })
  it('calcula el ahorro por kit y después lo multiplica por la cantidad', () => {
    // 50 + 30 + 25 = 105; el 10% de un kit es 10,5 → $11 por kit.
    // Por tres kits: 3 × 11 = 33 (no round(315 × 10%) = 32).
    expect(kitLineAmounts([pesos(50), pesos(30), pesos(25)], 3, 10)).toEqual({
      grossArs: 315,
      savingsArs: 33,
      totalArs: 282,
    })
  })
  it('rechaza un porcentaje fuera de rango', () => {
    expect(() => kitLineAmounts(KIT_PIECES, 1, 31)).toThrow(RangeError)
  })
})

describe('cartTotals', () => {
  const mate = productLineAmounts(pesos(39999), 1)
  const kit = kitLineAmounts(KIT_PIECES, 1, 10)

  it('un mate más un kit con envío de $6.500', () => {
    expect(cartTotals([mate, kit], pesos(6500))).toEqual({
      itemsGrossArs: 115996,
      kitSavingsArs: 7600,
      subtotalArs: 108396,
      shippingArs: 6500,
      totalArs: 114896,
    })
  })
  it('sin envío calculado el total es el subtotal', () => {
    const totals = cartTotals([mate, kit], null)
    expect(totals.shippingArs).toBeNull()
    expect(totals.totalArs).toBe(totals.subtotalArs)
    expect(totals.totalArs).toBe(108396)
  })
  it('con retiro en persona (envío $0) el envío queda en 0, no en null', () => {
    const totals = cartTotals([mate], pesos(0))
    expect(totals.shippingArs).toBe(0)
    expect(totals.totalArs).toBe(39999)
  })
  it('un carrito vacío da todo en 0', () => {
    expect(cartTotals([], null)).toEqual({
      itemsGrossArs: 0,
      kitSavingsArs: 0,
      subtotalArs: 0,
      shippingArs: null,
      totalArs: 0,
    })
  })
})
