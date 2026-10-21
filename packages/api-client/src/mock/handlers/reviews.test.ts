import { describe, expect, it } from 'vitest'
import type { MockReview } from '../types'
import { listFeaturedReviews, listProductReviews } from '../../services'
import { createMockApi, rawRequest } from '../../test/mock-api'

/** Reseña aprobada de prueba para un producto. */
function review(index: number, productId: string): MockReview {
  return {
    id: `rev-extra-${String(index)}`,
    productId,
    authorName: `Cliente ${String(index)}`,
    rating: 4,
    text: 'Muy lindo.',
    createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    status: 'approved',
    featured: false,
    verifiedPurchase: false,
  }
}

describe('GET /products/{slug}/reviews', () => {
  it('devuelve las reseñas del Imperial Premium con sus estadísticas', async () => {
    const page = await listProductReviews(createMockApi().api, 'mate-imperial-premium')
    expect(page).toMatchObject({ page: 1, pageSize: 10, total: 3 })
    expect(page.stats.count).toBe(3)
    expect(page.stats.average).toBeCloseTo(4.67, 2)
    expect(page.stats.distribution.find((bucket) => bucket.stars === 5)?.count).toBe(2)
    expect(page.stats.distribution.map((bucket) => bucket.stars)).toEqual([5, 4, 3, 2, 1])
    expect(page.items[0]).toEqual({
      id: 'rev-imperial-premium-1',
      authorName: 'Martina R.',
      rating: 5,
      text: expect.any(String) as unknown,
      createdAt: '2026-09-15T15:00:00Z',
      verifiedPurchase: true,
    })
  })

  it('cuenta solo las aprobadas y pagina de a 10, de la más nueva a la más vieja', async () => {
    const mock = createMockApi()
    const first = mock.db.reviews.find((item) => item.id === 'rev-imperial-premium-1')
    if (first === undefined) throw new Error('Falta la reseña')
    first.status = 'pending'
    mock.db.reviews.push(
      ...Array.from({ length: 12 }, (_, index) => review(index, 'prd-imperial-premium')),
    )
    const page1 = await listProductReviews(mock.api, 'mate-imperial-premium')
    const page2 = await listProductReviews(mock.api, 'mate-imperial-premium', 2)
    expect(page1.total).toBe(14)
    expect(page1.stats.count).toBe(14)
    expect(page1.items).toHaveLength(10)
    expect(page2.items).toHaveLength(4)
    expect(page1.items[0]?.createdAt).toBe('2026-08-15T15:00:00Z')
    expect([...page1.items, ...page2.items].some((item) => item.id === first.id)).toBe(false)
  })

  it('responde 404 si el producto no existe y 422 si la página no sirve', async () => {
    const mock = createMockApi()
    await expect(listProductReviews(mock.api, 'no-existe')).rejects.toMatchObject({ status: 404 })
    const response = await rawRequest(mock, '/products/mate-imperial-premium/reviews?page=0')
    expect(response.status).toBe(422)
  })
})

describe('GET /reviews/featured', () => {
  it('devuelve las 3 destacadas, cada una con el slug de su producto', async () => {
    const featured = await listFeaturedReviews(createMockApi().api)
    expect(featured).toHaveLength(3)
    for (const item of featured) {
      expect(item.product.slug).toEqual(expect.any(String))
      expect(item.product.name).toEqual(expect.any(String))
    }
    expect(featured.map((item) => item.product.slug)).toContain('mate-imperial-premium')
  })

  it('deja afuera las que no están aprobadas o son de productos no publicados', async () => {
    const mock = createMockApi()
    const hidden = mock.db.reviews.find((item) => item.id === 'rev-imperial-premium-1')
    const camionero = mock.db.products.find((product) => product.id === 'prd-camionero-pelo')
    if (hidden === undefined || camionero === undefined) throw new Error('Faltan datos')
    hidden.status = 'hidden'
    camionero.status = 'draft'
    expect(await listFeaturedReviews(mock.api)).toHaveLength(1)
  })
})
