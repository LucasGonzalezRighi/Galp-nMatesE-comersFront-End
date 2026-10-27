import { describe, expect, it } from 'vitest'
import {
  getDashboardSummary,
  listAdminMessages,
  listAdminReviews,
  listFeaturedReviews,
  updateAdminMessage,
  updateAdminReview,
} from '../../services'
import { createMockApi, rawRequest } from '../../test/mock-api'
import { createAdminDemoApi } from '../test/admin-demo-api'

describe('GET /admin/reviews', () => {
  it('sin sesión responde 401', async () => {
    await expect(listAdminReviews(createMockApi().api)).rejects.toMatchObject({ status: 401 })
  })

  it('lista todas las reseñas de la más nueva a la más vieja, de a 20, con su producto', async () => {
    const mock = await createAdminDemoApi()
    const page = await listAdminReviews(mock.api)
    expect(page).toMatchObject({ page: 1, pageSize: 20, total: 18 })
    expect(page.items).toHaveLength(18)
    const times = page.items.map((review) => Date.parse(review.createdAt))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
    expect(page.items.find((review) => review.id === 'rev-imperial-premium-1')).toMatchObject({
      status: 'approved',
      featured: true,
      verifiedPurchase: true,
      product: { slug: 'mate-imperial-premium', name: 'Mate Imperial Premium' },
    })
  })

  it('filtra por estado y responde 422 con uno que no existe', async () => {
    const mock = await createAdminDemoApi()
    const pending = await listAdminReviews(mock.api, { status: 'pending' })
    expect(pending.total).toBe(4)
    expect(pending.items.every((review) => review.status === 'pending')).toBe(true)
    const hidden = await listAdminReviews(mock.api, { status: 'hidden' })
    expect(hidden.total).toBe(1)
    const response = await rawRequest(mock, '/admin/reviews?status=borrada')
    expect(response.status).toBe(422)
  })
})

describe('PATCH /admin/reviews/{id}', () => {
  it('aprueba y destaca una reseña: aparece en las destacadas e invalida sus etiquetas', async () => {
    const mock = await createAdminDemoApi()
    const [review] = (await listAdminReviews(mock.api, { status: 'pending' })).items
    if (review === undefined) throw new Error('Falta una reseña pendiente')
    const updated = await updateAdminReview(mock.api, review.id, {
      status: 'approved',
      featured: true,
    })
    expect(updated).toMatchObject({ id: review.id, status: 'approved', featured: true })
    const featured = await listFeaturedReviews(mock.api)
    expect(featured.map((candidate) => candidate.id)).toContain(review.id)
    expect(mock.invalidated).toEqual([
      ['reviews:featured', `reviews:${review.product.slug}`, `product:${review.product.slug}`],
    ])
    expect((await getDashboardSummary(mock.api)).pendingReviews).toBe(3)
  })

  it('cambia solo lo que viene', async () => {
    const mock = await createAdminDemoApi()
    const updated = await updateAdminReview(mock.api, 'rev-imperial-premium-1', {
      featured: false,
    })
    expect(updated).toMatchObject({ status: 'approved', featured: false })
  })

  it('un cuerpo vacío responde 422, una reseña que no existe 404 y sin CSRF 403', async () => {
    const mock = await createAdminDemoApi()
    await expect(updateAdminReview(mock.api, 'rev-imperial-premium-1', {})).rejects.toMatchObject({
      status: 422,
    })
    await expect(
      updateAdminReview(mock.api, 'rev-no-existe', { status: 'hidden' }),
    ).rejects.toMatchObject({ status: 404 })
    mock.setCsrfToken('otro')
    await expect(
      updateAdminReview(mock.api, 'rev-imperial-premium-1', { status: 'hidden' }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('el servicio rechaza un identificador que no sirve para la ruta', () => {
    expect(() => updateAdminReview(createMockApi().api, '../x', { featured: true })).toThrow(
      RangeError,
    )
  })
})

describe('GET /admin/messages', () => {
  it('sin sesión responde 401', async () => {
    await expect(listAdminMessages(createMockApi().api)).rejects.toMatchObject({ status: 401 })
  })

  it('lista del más nuevo al más viejo y filtra por tipo y por leído', async () => {
    const mock = await createAdminDemoApi()
    const all = await listAdminMessages(mock.api)
    expect(all).toMatchObject({ page: 1, pageSize: 20, total: 8 })
    expect(all.items.map((message) => message.id)).toEqual([
      'msg-0008',
      'msg-0007',
      'msg-0006',
      'msg-0005',
      'msg-0004',
      'msg-0003',
      'msg-0002',
      'msg-0001',
    ])
    const unread = await listAdminMessages(mock.api, { read: false })
    expect(unread.total).toBe(3)
    const unreadWithdrawals = await listAdminMessages(mock.api, {
      kind: 'withdrawal',
      read: false,
    })
    expect(unreadWithdrawals.items.map((message) => message.code)).toEqual(['ARR-000003'])
    const response = await rawRequest(mock, '/admin/messages?kind=queja&read=quizas')
    expect(response.status).toBe(422)
  })
})

describe('PATCH /admin/messages/{id}', () => {
  it('marca un mensaje como leído y como no leído', async () => {
    const mock = await createAdminDemoApi()
    await expect(updateAdminMessage(mock.api, 'msg-0008', { read: true })).resolves.toMatchObject({
      id: 'msg-0008',
      read: true,
    })
    expect((await getDashboardSummary(mock.api)).unreadMessages).toBe(2)
    await updateAdminMessage(mock.api, 'msg-0001', { read: false })
    expect((await getDashboardSummary(mock.api)).unreadMessages).toBe(3)
  })

  it('un cuerpo inválido responde 422 y un mensaje que no existe, 404', async () => {
    const mock = await createAdminDemoApi()
    await expect(
      updateAdminMessage(mock.api, 'msg-0001', { read: 'sí' as never }),
    ).rejects.toMatchObject({ status: 422 })
    await expect(updateAdminMessage(mock.api, 'msg-9999', { read: true })).rejects.toMatchObject({
      status: 404,
    })
  })
})
