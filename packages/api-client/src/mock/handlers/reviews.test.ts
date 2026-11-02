import { describe, expect, it } from 'vitest'
import type { MockReview } from '../types'
import { createReview, listFeaturedReviews, listProductReviews } from '../../services'
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

  it('una media estrella entra en el promedio y en la fila de su parte entera', async () => {
    const page = await listProductReviews(
      createMockApi().api,
      'mate-torpedo-virola-de-alpaca-cincelada',
    )
    expect(page.items.map((item) => item.rating)).toEqual([4.5])
    expect(page.stats).toMatchObject({ average: 4.5, count: 1 })
    expect(page.stats.distribution.find((bucket) => bucket.stars === 4)).toEqual({
      stars: 4,
      count: 1,
      percent: 100,
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
  it('devuelve las 10 destacadas, cada una con el slug de su producto', async () => {
    const featured = await listFeaturedReviews(createMockApi().api)
    expect(featured).toHaveLength(10)
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
    expect(await listFeaturedReviews(mock.api)).toHaveLength(7)
  })
})

/** Hora fija de los pedidos, para comprobar la fecha con que se guarda la reseña. */
const NOW = new Date('2026-10-21T15:00:00.000Z')

/** Reseña válida; cada test cambia lo que prueba. */
const VALID_REVIEW = {
  rating: 5,
  authorName: 'Paula N.',
  text: 'Muuu. Es el mate más lindo que tengo.',
  website: null,
}

/** Manda una reseña con el cuerpo tal cual, sin pasar por el servicio. */
function postReview(mock: ReturnType<typeof createMockApi>, slug: string, body: unknown) {
  return rawRequest(mock, `/products/${slug}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /products/{slug}/reviews', () => {
  it('guarda la reseña pendiente y responde con su estado', async () => {
    const mock = createMockApi({ now: () => NOW })
    const before = mock.db.reviews.length
    await expect(createReview(mock.api, 'mate-imperial-premium', VALID_REVIEW)).resolves.toEqual({
      status: 'pending',
    })
    expect(mock.db.reviews).toHaveLength(before + 1)
    expect(mock.db.reviews.at(-1)).toEqual({
      id: expect.stringMatching(/^rev-/) as unknown,
      productId: 'prd-imperial-premium',
      authorName: 'Paula N.',
      rating: 5,
      text: 'Muuu. Es el mate más lindo que tengo.',
      createdAt: '2026-10-21T15:00:00.000Z',
      status: 'pending',
      featured: false,
      verifiedPurchase: false,
    })
  })

  it('responde 202', async () => {
    const mock = createMockApi()
    const response = await postReview(mock, 'mate-imperial-premium', VALID_REVIEW)
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ status: 'pending' })
  })

  it('no la muestra ni la cuenta hasta que se apruebe', async () => {
    const mock = createMockApi()
    const before = await listProductReviews(mock.api, 'mate-imperial-premium')
    await createReview(mock.api, 'mate-imperial-premium', VALID_REVIEW)
    const after = await listProductReviews(mock.api, 'mate-imperial-premium')
    expect(after).toEqual(before)
  })

  it('firma como "Anónimo" si el nombre falta, es null o está en blanco', async () => {
    const mock = createMockApi()
    await createReview(mock.api, 'mate-imperial-premium', { rating: 4, text: VALID_REVIEW.text })
    await createReview(mock.api, 'mate-imperial-premium', { ...VALID_REVIEW, authorName: null })
    await createReview(mock.api, 'mate-imperial-premium', { ...VALID_REVIEW, authorName: '   ' })
    expect(mock.db.reviews.slice(-3).map((item) => item.authorName)).toEqual([
      'Anónimo',
      'Anónimo',
      'Anónimo',
    ])
  })

  it('recorta el nombre y el texto', async () => {
    const mock = createMockApi()
    await createReview(mock.api, 'mate-imperial-premium', {
      ...VALID_REVIEW,
      authorName: '  Paula N.  ',
      text: '  Un mate hermoso.  ',
    })
    expect(mock.db.reviews.at(-1)).toMatchObject({
      authorName: 'Paula N.',
      text: 'Un mate hermoso.',
    })
  })

  it('acepta el producto por un slug anterior', async () => {
    const mock = createMockApi()
    const product = mock.db.products.find((item) => item.slug === 'mate-imperial-premium')
    if (product === undefined) throw new Error('Falta el producto')
    product.previousSlugs = ['imperial-viejo']
    await createReview(mock.api, 'imperial-viejo', VALID_REVIEW)
    expect(mock.db.reviews.at(-1)?.productId).toBe(product.id)
  })

  it('descarta en silencio lo que llega con el campo trampa lleno', async () => {
    const mock = createMockApi()
    const before = mock.db.reviews.length
    const body = { ...VALID_REVIEW, website: 'https://spam.example' }
    const response = await postReview(mock, 'mate-imperial-premium', body)
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ status: 'pending' })
    // También si el resto no es válido: al bot no se le explica qué falló.
    const invalid = await postReview(mock, 'mate-imperial-premium', { website: 'x', rating: 9 })
    expect(invalid.status).toBe(202)
    expect(mock.db.reviews).toHaveLength(before)
  })

  it('responde 404 si el producto no existe o no está publicado', async () => {
    const mock = createMockApi()
    await expect(createReview(mock.api, 'no-existe', VALID_REVIEW)).rejects.toMatchObject({
      kind: 'not_found',
      status: 404,
    })
    const product = mock.db.products.find((item) => item.slug === 'mate-imperial-premium')
    if (product === undefined) throw new Error('Falta el producto')
    product.status = 'draft'
    await expect(
      createReview(mock.api, 'mate-imperial-premium', VALID_REVIEW),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('responde 422 con los mensajes en español de cada campo y no guarda nada', async () => {
    const mock = createMockApi()
    const before = mock.db.reviews.length
    const response = await postReview(mock, 'mate-imperial-premium', {
      rating: 6,
      authorName: 'x'.repeat(41),
      text: 'corto',
      website: null,
    })
    expect(response.status).toBe(422)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({
      type: 'validation_error',
      status: 422,
      errors: [
        { field: 'rating', message: 'Elegí una puntuación de 1 a 5 estrellas.' },
        { field: 'authorName', message: 'Máximo 40 caracteres' },
        { field: 'text', message: 'Contanos un poco más (mínimo 10 caracteres)' },
      ],
    })
    expect(mock.db.reviews).toHaveLength(before)
  })

  it('pide la puntuación y el texto si faltan, y rechaza un texto de más de 600 caracteres', async () => {
    const mock = createMockApi()
    const missing = await postReview(mock, 'mate-imperial-premium', {})
    expect(missing.status).toBe(422)
    expect(await missing.json()).toMatchObject({
      errors: [
        { field: 'rating', message: 'Elegí una puntuación de 1 a 5 estrellas.' },
        { field: 'text', message: 'Contanos un poco más (mínimo 10 caracteres)' },
      ],
    })
    const long = await postReview(mock, 'mate-imperial-premium', {
      ...VALID_REVIEW,
      text: 'a'.repeat(601),
    })
    expect(long.status).toBe(422)
    expect(await long.json()).toMatchObject({
      errors: [{ field: 'text', message: 'Máximo 600 caracteres' }],
    })
  })

  it('responde 422 si el cuerpo no es JSON o si el slug no tiene formato', async () => {
    const mock = createMockApi()
    const notJson = await rawRequest(mock, '/products/mate-imperial-premium/reviews', {
      method: 'POST',
      body: 'esto no es JSON',
    })
    expect(notJson.status).toBe(422)
    const badSlug = await postReview(mock, 'Mate%20Raro', VALID_REVIEW)
    expect(badSlug.status).toBe(422)
    expect(await badSlug.json()).toMatchObject({ errors: [{ field: 'slug' }] })
  })
})
