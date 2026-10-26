import { describe, expect, it } from 'vitest'
import { computeHomeStats } from './home-stats'
import { loadFixtureCatalog, withProduct } from './test/fixture-catalog'

describe('computeHomeStats', () => {
  it('calcula las cifras del catálogo de fábrica: 27 piezas, 6 líneas, 16 modelos de mate, 4 líneas de mate y 4 cueros', async () => {
    const { products, categories } = await loadFixtureCatalog()
    const stats = computeHomeStats(products, categories)
    expect(stats.pieces).toBe(27)
    expect(stats.lines).toBe(6)
    expect(stats.mateModels).toBe(16)
    expect(stats.mateLines).toBe(4)
    expect(stats.leathers).toBe(4)
  })

  it('cuenta en el kit solo las opciones comprables de cada grupo', async () => {
    const { products, categories } = await loadFixtureCatalog()
    const before = computeHomeStats(products, categories)
    const purchasable = (group: string): number =>
      products.filter((product) => product.group === group && product.isPurchasable).length
    expect(before.kitOptions).toEqual({
      mate: purchasable('mate'),
      bombilla: purchasable('bombilla'),
      yerba: purchasable('yerba'),
    })

    // Un mate sin stock sigue siendo un modelo del catálogo, pero ya no es una opción del kit.
    const soldOut = withProduct(products, 'mate-imperial-premium', {
      isPurchasable: false,
      isSoldOut: true,
    })
    const after = computeHomeStats(soldOut, categories)
    expect(after.mateModels).toBe(before.mateModels)
    expect(after.pieces).toBe(before.pieces)
    expect(after.kitOptions.mate).toBe(before.kitOptions.mate - 1)
  })

  it('no cuenta las líneas sin productos publicados', async () => {
    const { products, categories } = await loadFixtureCatalog()
    const [first, ...rest] = categories
    if (first === undefined) throw new Error('El catálogo de fábrica no tiene líneas.')
    const stats = computeHomeStats(products, [{ ...first, productCount: 0 }, ...rest])
    expect(stats.lines).toBe(5)
  })

  it('con el catálogo vacío devuelve todo en cero (menos los cueros, que son del dominio)', () => {
    expect(computeHomeStats([], [])).toEqual({
      pieces: 0,
      lines: 0,
      mateModels: 0,
      mateLines: 0,
      leathers: 4,
      kitOptions: { mate: 0, bombilla: 0, yerba: 0 },
    })
  })

  it('rechaza una línea con una cantidad de productos que no es un entero mayor o igual a 0', async () => {
    const { categories } = await loadFixtureCatalog()
    const [first] = categories
    if (first === undefined) throw new Error('El catálogo de fábrica no tiene líneas.')
    expect(() => computeHomeStats([], [{ ...first, productCount: -1 }])).toThrow(RangeError)
    expect(() => computeHomeStats([], [{ ...first, productCount: 2.5 }])).toThrow(RangeError)
  })
})
