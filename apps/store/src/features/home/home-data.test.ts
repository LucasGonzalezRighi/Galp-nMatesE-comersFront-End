import { describe, expect, it } from 'vitest'
import type { Combo } from '@galpon/api-client'
import { createApiClient, listCombos } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'
import { buildHomeData, COMBOS_LIMIT, FEATURED_LIMIT, lineHref, REVIEWS_LIMIT } from './home-data'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** Los combos a la venta de la base simulada de fábrica, como los trae `GET /combos`. */
async function fixtureCombos(): Promise<Combo[]> {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const fetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  return await listCombos(createApiClient({ baseUrl: 'http://localhost/api/mock/v1', fetch }))
}

describe('buildHomeData', () => {
  it('arma los datos del inicio con el catálogo de fábrica', async () => {
    const catalog = await loadFixtureCatalog()
    const data = buildHomeData(catalog)
    expect(data.featured).toHaveLength(8)
    expect(data.featured.every((product) => product.featured)).toBe(true)
    expect(data.lines).toHaveLength(6)
    expect(data.lines.map((line) => line.position)).toEqual([1, 2, 3, 4, 5, 6])
    expect(data.stats.pieces).toBe(27)
    expect(data.story.hero?.slug).toBe('mate-imperial-premium')
    // La portada del v4 arranca por el mismo mate y tiene sus cinco piezas (Ruling IC-7).
    expect(data.heroSlides).toHaveLength(5)
    expect(data.heroSlides[0]).toBe(data.story.hero)
    expect(data.kitDiscountLabel).toBe('−10%')
    expect(data.reviews.length).toBeGreaterThan(0)
    expect(data.reviews.length).toBeLessThanOrEqual(REVIEWS_LIMIT)
  })

  it('muestra como mucho los destacados y las reseñas que entran en el diseño', async () => {
    const catalog = await loadFixtureCatalog()
    const manyFeatured = catalog.products.map((product) => ({ ...product, featured: true }))
    const [review] = catalog.reviews
    if (review === undefined) throw new Error('El catálogo de fábrica no tiene reseñas destacadas.')
    const data = buildHomeData({
      ...catalog,
      products: manyFeatured,
      reviews: Array.from({ length: 12 }, () => review),
    })
    expect(data.featured).toHaveLength(FEATURED_LIMIT)
    expect(REVIEWS_LIMIT).toBe(10)
    expect(data.reviews).toHaveLength(REVIEWS_LIMIT)
  })

  it('sin descuento en el kit no hay etiqueta de descuento', async () => {
    const catalog = await loadFixtureCatalog()
    const data = buildHomeData({
      ...catalog,
      settings: { ...catalog.settings, kitDiscountPercent: 0 },
    })
    expect(data.kitDiscountLabel).toBeNull()
  })

  it('no incluye las líneas sin productos publicados y las ordena por su lugar en el listado', async () => {
    const catalog = await loadFixtureCatalog()
    const [first, second, ...rest] = catalog.categories
    if (first === undefined || second === undefined) throw new Error('Faltan líneas.')
    const shuffled = [{ ...second, productCount: 0 }, first, ...rest]
    const data = buildHomeData({ ...catalog, categories: shuffled })
    expect(data.lines.map((line) => line.id)).not.toContain(second.id)
    expect(data.lines[0]?.id).toBe(first.id)
  })
})

describe('buildHomeData: combos (Ruling IC-12)', () => {
  it('sin combos (o si no se pudieron leer) la lista queda vacía', async () => {
    const catalog = await loadFixtureCatalog()
    expect(buildHomeData(catalog).combos).toEqual([])
    expect(buildHomeData({ ...catalog, combos: [] }).combos).toEqual([])
  })

  it('trae los combos a la venta por posición, como mucho seis', async () => {
    const catalog = await loadFixtureCatalog()
    const combos = await fixtureCombos()
    expect(buildHomeData({ ...catalog, combos }).combos.map((combo) => combo.name)).toEqual([
      'Dúo Imperial',
      'Camionero y Canarias',
      'Torpedo completo',
      'Bombilla y yerba',
    ])

    const [first] = combos
    if (first === undefined) throw new Error('Faltan los combos de fábrica.')
    const many = Array.from({ length: 8 }, (_, index) => ({
      ...first,
      id: `cmb-${String(index)}`,
      position: 8 - index,
    }))
    const data = buildHomeData({ ...catalog, combos: many })
    expect(COMBOS_LIMIT).toBe(6)
    expect(data.combos.map((combo) => combo.position)).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('lineHref', () => {
  it('lleva a la primera línea del grupo, y a la tienda si no hay ninguna', async () => {
    const { categories } = await loadFixtureCatalog()
    const bombillones = categories.find((category) => category.group === 'bombilla')
    expect(bombillones).toBeDefined()
    expect(lineHref(categories, 'bombilla')).toBe(`/tienda/${bombillones?.slug ?? ''}`)
    expect(lineHref([], 'bombilla')).toBe('/tienda')
  })
})
