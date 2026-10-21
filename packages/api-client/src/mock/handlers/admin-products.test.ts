import { describe, expect, it } from 'vitest'
import { listAdminProducts } from '../../services'
import { createMockApi, loginAsAdmin, rawRequest } from '../../test/mock-api'

describe('GET /admin/products', () => {
  it('sin sesión responde 401', async () => {
    await expect(listAdminProducts(createMockApi().api)).rejects.toMatchObject({ status: 401 })
  })

  it('con sesión devuelve los 27 productos por código, con los datos del dashboard', async () => {
    const mock = createMockApi()
    await loginAsAdmin(mock)
    const page = await listAdminProducts(mock.api)
    expect(page).toMatchObject({ page: 1, pageSize: 24, total: 27 })
    expect(page.items[0]).toMatchObject({
      id: 'prd-imperial-premium',
      code: 'N°01',
      sequence: 1,
      status: 'published',
      stock: 12,
      tabsOverride: null,
      previousSlugs: [],
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: '2026-09-01T12:00:00Z',
    })
    expect(page.items.map((product) => product.sequence)).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1),
    )
  })

  it('incluye los borradores y deja afuera los archivados salvo que se pidan', async () => {
    const mock = createMockApi()
    await loginAsAdmin(mock)
    const [first, second] = mock.db.products
    if (first === undefined || second === undefined) throw new Error('Faltan productos')
    first.status = 'draft'
    first.tabsOverride = { care: 'Propio.' }
    second.status = 'archived'
    const page = await listAdminProducts(mock.api, { pageSize: 100 })
    expect(page.total).toBe(26)
    expect(page.items[0]).toMatchObject({
      status: 'draft',
      isPurchasable: false,
      tabsOverride: { care: 'Propio.', materials: null },
    })
    expect((await listAdminProducts(mock.api, { status: 'archived' })).total).toBe(1)
    expect((await listAdminProducts(mock.api, { status: 'draft' })).total).toBe(1)
  })

  it('filtra por stock agotado, línea y búsqueda por nombre o código', async () => {
    const mock = createMockApi()
    await loginAsAdmin(mock)
    const soldOut = await listAdminProducts(mock.api, { stock: 'out' })
    expect(soldOut.items.map((product) => product.id)).toEqual(['prd-galleta'])
    expect((await listAdminProducts(mock.api, { category: 'torpedos' })).total).toBe(6)
    expect((await listAdminProducts(mock.api, { q: 'n°05' })).items[0]?.sequence).toBe(5)
    expect((await listAdminProducts(mock.api, { q: 'camionero' })).total).toBe(3)
    const cheapest = await listAdminProducts(mock.api, { sort: 'menor' })
    expect(cheapest.items[0]?.priceArs).toBe(9999)
  })

  it('responde 422 si un parámetro no sirve', async () => {
    const mock = createMockApi()
    await loginAsAdmin(mock)
    const response = await rawRequest(mock, '/admin/products?status=borrado&pageSize=101')
    expect(response.status).toBe(422)
    const body = (await response.json()) as { errors: { field: string }[] }
    expect(body.errors.map((error) => error.field).sort()).toEqual(['pageSize', 'status'])
  })
})
