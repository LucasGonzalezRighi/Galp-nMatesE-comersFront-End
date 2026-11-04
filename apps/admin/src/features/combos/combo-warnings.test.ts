import { describe, expect, it } from 'vitest'
import type { Combo, ComboItem } from '@galpon/api-client'
import { LEATHERS } from '@galpon/domain'
import { comboWarnings } from './combo-warnings'

/** Una pieza que se puede comprar. */
function item(overrides: Partial<ComboItem> = {}): ComboItem {
  return {
    productId: 'prd-imperial-premium',
    slug: 'mate-imperial-premium',
    name: 'Mate Imperial Premium',
    group: 'mate',
    leathers: [...LEATHERS],
    unitPriceArs: 39999,
    isPurchasable: true,
    maxQuantity: 10,
    image: null,
    ...overrides,
  }
}

/** El Dúo Imperial como lo devuelve la API, con lo que se pase encima. */
function combo(overrides: Partial<Combo> = {}): Combo {
  return {
    id: 'cmb-duo-imperial',
    name: 'Dúo Imperial',
    description: '',
    items: [
      item(),
      item({
        productId: 'prd-bombillon-premium-curvo',
        slug: 'bombillon-premium-curvo',
        name: 'Bombillón Premium Curvo',
        group: 'bombilla',
        leathers: [],
        unitPriceArs: 28999,
      }),
    ],
    priceArs: 61999,
    netPriceArs: null,
    listPriceArs: 68998,
    savingsArs: 6999,
    isPurchasable: true,
    isSoldOut: false,
    maxQuantity: 10,
    status: 'published',
    position: 1,
    ...overrides,
  }
}

describe('comboWarnings', () => {
  it('no avisa nada si todas las piezas se venden y hay ahorro (aunque sea borrador)', () => {
    expect(comboWarnings(combo())).toEqual([])
    expect(comboWarnings(combo({ status: 'draft', isPurchasable: false, maxQuantity: 0 }))).toEqual(
      [],
    )
  })

  it('avisa "Sin stock" si una pieza se agotó', () => {
    const soldOut = combo({
      items: [item({ isPurchasable: false, maxQuantity: 0 }), combo().items[1] ?? item()],
      isSoldOut: true,
      isPurchasable: false,
      maxQuantity: 0,
    })
    expect(comboWarnings(soldOut)).toEqual(['soldOut'])
  })

  it('avisa "Pieza no disponible" si una pieza no se vende aunque tenga stock o no tiene precio', () => {
    const unpublished = combo({
      items: [item({ isPurchasable: false, maxQuantity: 5 }), combo().items[1] ?? item()],
      isPurchasable: false,
    })
    expect(comboWarnings(unpublished)).toEqual(['unavailable'])
    const onRequest = combo({
      items: [item({ unitPriceArs: null, isPurchasable: false }), combo().items[1] ?? item()],
      listPriceArs: 28999,
      savingsArs: 0,
      isPurchasable: false,
    })
    expect(comboWarnings(onRequest)).toEqual(['unavailable', 'noSavings'])
  })

  it('avisa "Pieza no disponible" si al combo le falta una pieza que ya no existe', () => {
    expect(comboWarnings(combo({ items: [item()], isPurchasable: false }))).toEqual(['unavailable'])
  })

  it('avisa "Sin ahorro" si las piezas ya suman lo mismo o menos que el combo', () => {
    expect(comboWarnings(combo({ listPriceArs: 61999, savingsArs: 0 }))).toEqual(['noSavings'])
  })
})
