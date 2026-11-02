import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findProduct,
  getProductReviews,
  getRelatedProducts,
  listProductSlugs,
} from './product.data'
import { currentTestApi, useFreshTestApi } from './test/support'

// Las lecturas del servidor ('use cache' y 'server-only') no corren en las pruebas: se simulan.
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock('../../lib/api.server', async () => {
  const { currentTestApi: api } = await import('./test/support')
  return { getServerApi: api }
})

beforeEach(() => {
  useFreshTestApi()
})

describe('findProduct', () => {
  it('devuelve la ficha de un producto publicado', async () => {
    const product = await findProduct('mate-imperial-premium')
    expect(product?.name).toBe('Mate Imperial Premium')
    expect(product?.slug).toBe('mate-imperial-premium')
  })

  it('devuelve null con un slug inexistente', async () => {
    expect(await findProduct('no-existe')).toBeNull()
  })

  it('devuelve null con un slug inválido, sin llegar a la API ni lanzar RangeError', async () => {
    const get = vi.spyOn(currentTestApi(), 'GET')
    const invalid = [
      'Mate-Imperial-Premium',
      '..',
      '../admin',
      '%',
      '%E0%A4%A',
      '<script>',
      'con espacios',
      '-guion',
      'doble--guion',
      '',
      'a'.repeat(81),
    ]
    for (const slug of invalid) {
      expect(await findProduct(slug)).toBeNull()
    }
    expect(get).not.toHaveBeenCalled()
  })

  it('con un slug anterior devuelve la ficha con su slug actual', async () => {
    const { db } = useFreshTestApi()
    const stored = db.products.find((item) => item.slug === 'mate-imperial-premium')
    if (stored === undefined) throw new Error('Falta el producto')
    stored.previousSlugs = ['imperial-viejo']
    const product = await findProduct('imperial-viejo')
    expect(product?.slug).toBe('mate-imperial-premium')
  })
})

describe('lecturas de la ficha', () => {
  it('lista los slugs de todos los productos publicados', async () => {
    const slugs = await listProductSlugs()
    expect(slugs).toContain('mate-imperial-premium')
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('trae relacionados y la primera página de reseñas con sus estadísticas', async () => {
    const related = await getRelatedProducts('mate-imperial-premium')
    expect(related.length).toBeGreaterThan(0)
    expect(related.length).toBeLessThanOrEqual(4)
    expect(related.map((item) => item.slug)).not.toContain('mate-imperial-premium')
    const reviews = await getProductReviews('mate-imperial-premium')
    expect(reviews.stats.count).toBe(3)
    expect(reviews.items).toHaveLength(3)
  })
})
