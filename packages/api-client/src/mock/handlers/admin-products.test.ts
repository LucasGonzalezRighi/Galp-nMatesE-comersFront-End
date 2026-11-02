import { describe, expect, it } from 'vitest'
import type { AdminProductInput } from '../../generated/schema'
import {
  archiveAdminProduct,
  createAdminProduct,
  getAdminProduct,
  listAdminProducts,
  updateAdminProduct,
} from '../../services'
import { createMockApi, loginAsAdmin, rawRequest } from '../../test/mock-api'
import { MATE_IMPERIAL_PREMIUM_IMAGE } from '../fixtures/products'

const NOW = new Date('2026-10-27T15:00:00Z')

/** Producto válido para el formulario del dashboard, en borrador y sin fotos. */
function productInput(overrides: Partial<AdminProductInput> = {}): AdminProductInput {
  return {
    categoryId: 'cat-torpedos',
    name: 'Mate Torpedo de Prueba',
    slug: 'mate-torpedo-de-prueba',
    description: 'Un mate de prueba con virola de alpaca.',
    priceArs: 31999,
    stock: 5,
    featured: false,
    status: 'draft',
    tabsOverride: null,
    images: [],
    ...overrides,
  }
}

/** API simulada con sesión, reloj ajustable y registro de las invalidaciones. */
async function adminApi() {
  let now = NOW
  const invalidated: string[][] = []
  const mock = createMockApi({
    now: () => now,
    onInvalidate: (tags) => invalidated.push([...tags]),
  })
  await loginAsAdmin(mock)
  return {
    ...mock,
    invalidated,
    advance(minutes: number) {
      now = new Date(now.getTime() + minutes * 60_000)
    },
  }
}

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

describe('POST /admin/products', () => {
  it('crea el producto con el código siguiente y las fechas de ahora', async () => {
    const mock = await adminApi()
    const created = await createAdminProduct(
      mock.api,
      productInput({ tabsOverride: { materials: '  Calabaza y alpaca.  ', care: null } }),
    )
    expect(created).toMatchObject({
      slug: 'mate-torpedo-de-prueba',
      sequence: 28,
      code: 'N°28',
      status: 'draft',
      categoryName: 'Torpedos',
      priceArs: 31999,
      stock: 5,
      images: [],
      previousSlugs: [],
      tabsOverride: { materials: 'Calabaza y alpaca.', care: null },
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    })
    expect(mock.db.products).toHaveLength(28)
    expect(mock.invalidated).toEqual([['products']])
    await expect(getAdminProduct(mock.api, created.id)).resolves.toEqual(created)
  })

  it('responde 422 si la línea no existe o un campo no sirve', async () => {
    const mock = await adminApi()
    await expect(
      createAdminProduct(mock.api, productInput({ categoryId: 'cat-otra' })),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { categoryId: 'Esa línea no existe' } })
    await expect(
      createAdminProduct(mock.api, productInput({ name: '', stock: -1 })),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: 'Requerido', stock: expect.any(String) as unknown },
    })
    expect(mock.db.products).toHaveLength(27)
  })

  it('responde 409 slug_taken con el slug actual o uno anterior de otro producto', async () => {
    const mock = await adminApi()
    const other = mock.db.products[1]
    if (other === undefined) throw new Error('Falta el producto')
    other.previousSlugs = ['mate-de-antes']
    for (const slug of ['mate-imperial-premium', 'mate-de-antes']) {
      await expect(createAdminProduct(mock.api, productInput({ slug }))).rejects.toMatchObject({
        status: 409,
        problem: { type: 'slug_taken' },
      })
    }
    expect(mock.db.products).toHaveLength(27)
  })

  it('arma las fotos: conocidas por la base simulada, de los fixtures o propias', async () => {
    const mock = await adminApi()
    const dataUrl = 'data:image/webp;base64,UklGRg=='
    mock.db.media['galpon/productos/mock-1'] = {
      url: dataUrl,
      width: 1200,
      height: 1600,
      createdAt: NOW.toISOString(),
    }
    const created = await createAdminProduct(
      mock.api,
      productInput({
        images: [
          { publicId: 'galpon/productos/mock-1', width: 1200, height: 1600, alt: ' Foto subida ' },
          { ...MATE_IMPERIAL_PREMIUM_IMAGE, alt: 'Foto del diseño' },
        ],
      }),
    )
    expect(created.images).toEqual([
      {
        publicId: 'galpon/productos/mock-1',
        url: dataUrl,
        width: 1200,
        height: 1600,
        alt: 'Foto subida',
      },
      { ...MATE_IMPERIAL_PREMIUM_IMAGE, alt: 'Foto del diseño' },
    ])
  })

  it('responde 422 en el campo de la foto si no la conoce', async () => {
    const mock = await adminApi()
    const image = { publicId: 'galpon/productos/no-existe', width: 900, height: 900, alt: 'Foto' }
    await expect(
      createAdminProduct(mock.api, productInput({ images: [MATE_IMPERIAL_PREMIUM_IMAGE, image] })),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { 'images.1.publicId': 'La foto no existe: subila de nuevo' },
    })
  })
})

describe('GET /admin/products/{id}', () => {
  it('devuelve el producto en cualquier estado y 404 si no existe', async () => {
    const mock = await adminApi()
    const first = mock.db.products[0]
    if (first === undefined) throw new Error('Falta el producto')
    first.status = 'archived'
    await expect(getAdminProduct(mock.api, 'prd-imperial-premium')).resolves.toMatchObject({
      id: 'prd-imperial-premium',
      status: 'archived',
    })
    await expect(getAdminProduct(mock.api, 'prd-no-existe')).rejects.toMatchObject({
      status: 404,
    })
  })
})

describe('PATCH /admin/products/{id}', () => {
  it('guarda los cambios, conserva la foto propia y actualiza updatedAt', async () => {
    const mock = await adminApi()
    const own = mock.db.products[0]?.images[0]
    if (own === undefined) throw new Error('Falta la foto')
    own.url = '/fotos/propia.jpg'
    mock.advance(5)
    const product = await getAdminProduct(mock.api, 'prd-imperial-premium')
    const updated = await updateAdminProduct(mock.api, product.id, {
      ...productInput({ slug: product.slug, categoryId: 'cat-imperiales', status: 'published' }),
      images: [{ publicId: own.publicId, width: 960, height: 1280, alt: 'Otra descripción' }],
      expectedUpdatedAt: product.updatedAt,
    })
    expect(updated).toMatchObject({
      name: 'Mate Torpedo de Prueba',
      sequence: 1,
      status: 'published',
      images: [{ publicId: own.publicId, url: '/fotos/propia.jpg', alt: 'Otra descripción' }],
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: new Date(NOW.getTime() + 5 * 60_000).toISOString(),
    })
    expect(mock.invalidated).toEqual([['products']])
  })

  it('cambiar el slug guarda el anterior, y volver a uno propio lo saca de la lista', async () => {
    const mock = await adminApi()
    const id = 'prd-imperial-premium'
    const input = productInput({ categoryId: 'cat-imperiales' })
    await updateAdminProduct(mock.api, id, { ...input, slug: 'imperial-nuevo' })
    const second = await updateAdminProduct(mock.api, id, { ...input, slug: 'imperial-otro' })
    expect(second.previousSlugs).toEqual(['mate-imperial-premium', 'imperial-nuevo'])
    const back = await updateAdminProduct(mock.api, id, { ...input, slug: 'mate-imperial-premium' })
    expect(back.slug).toBe('mate-imperial-premium')
    expect(back.previousSlugs).toEqual(['imperial-nuevo', 'imperial-otro'])
  })

  it('responde 409 slug_taken si el slug es de otro producto, también uno anterior', async () => {
    const mock = await adminApi()
    const other = mock.db.products[1]
    if (other === undefined) throw new Error('Falta el producto')
    other.previousSlugs = ['mate-de-antes']
    for (const slug of [other.slug, 'mate-de-antes']) {
      await expect(
        updateAdminProduct(mock.api, 'prd-imperial-premium', productInput({ slug })),
      ).rejects.toMatchObject({ status: 409, problem: { type: 'slug_taken' } })
    }
    expect(mock.db.products[0]?.slug).toBe('mate-imperial-premium')
  })

  it('responde 409 product_changed si cambió desde que se abrió, sin guardar nada', async () => {
    const mock = await adminApi()
    const opened = await getAdminProduct(mock.api, 'prd-imperial-premium')
    mock.advance(1)
    const input = productInput({ slug: opened.slug })
    await updateAdminProduct(mock.api, opened.id, { ...input, name: 'Cambio de otra pestaña' })
    await expect(
      updateAdminProduct(mock.api, opened.id, {
        ...input,
        name: 'Mi cambio',
        expectedUpdatedAt: opened.updatedAt,
      }),
    ).rejects.toMatchObject({ status: 409, problem: { type: 'product_changed' } })
    expect(mock.db.products[0]?.name).toBe('Cambio de otra pestaña')
  })

  it('responde 404 si el producto no existe', async () => {
    const mock = await adminApi()
    await expect(
      updateAdminProduct(mock.api, 'prd-no-existe', productInput()),
    ).rejects.toMatchObject({ status: 404 })
  })
})

describe('POST /admin/products/{id}/archive', () => {
  it('archiva (dos veces da lo mismo) y un PATCH con published lo vuelve a publicar', async () => {
    const mock = await adminApi()
    const id = 'prd-imperial-premium'
    await expect(archiveAdminProduct(mock.api, id)).resolves.toMatchObject({ status: 'archived' })
    await expect(archiveAdminProduct(mock.api, id)).resolves.toMatchObject({ status: 'archived' })
    expect(mock.invalidated).toEqual([['products'], ['products']])
    const republished = await updateAdminProduct(
      mock.api,
      id,
      productInput({ slug: 'mate-imperial-premium', status: 'published' }),
    )
    expect(republished.status).toBe('published')
    await expect(archiveAdminProduct(mock.api, 'prd-no-existe')).rejects.toMatchObject({
      status: 404,
    })
  })
})
