import { describe, expect, it } from 'vitest'
import { getProduct, listCategories, listProducts, listRelatedProducts } from '../../services'
import { createMockApi, rawRequest } from '../../test/mock-api'
import { FIXTURE_PRODUCTS } from '../fixtures'

describe('GET /categories', () => {
  it('devuelve las 6 líneas en orden, con 27 productos en total', async () => {
    const categories = await listCategories(createMockApi().api)
    expect(categories).toHaveLength(6)
    expect(categories.map((category) => category.position)).toEqual([1, 2, 3, 4, 5, 6])
    expect(categories.reduce((total, category) => total + category.productCount, 0)).toBe(27)
  })

  it('cuenta solo los productos publicados', async () => {
    const mock = createMockApi()
    const [first, second] = mock.db.products
    if (first === undefined || second === undefined) throw new Error('Faltan productos')
    first.status = 'draft'
    second.status = 'archived'
    const categories = await listCategories(mock.api)
    expect(categories.reduce((total, category) => total + category.productCount, 0)).toBe(25)
  })
})

describe('GET /products', () => {
  it('filtra por grupo, línea, búsqueda, ids y destacados', async () => {
    const { api } = createMockApi()
    expect((await listProducts(api, { group: 'mate' })).total).toBe(16)
    expect((await listProducts(api, { category: 'imperiales' })).total).toBe(4)
    expect((await listProducts(api, { category: 'no-existe' })).total).toBe(0)
    expect((await listProducts(api, { q: 'bombillon' })).total).toBe(8)
    expect((await listProducts(api, { q: 'BOMBILLÓN' })).total).toBe(8)
    expect((await listProducts(api, { ids: 'prd-galleta,prd-imperial-premium' })).total).toBe(2)
    expect((await listProducts(api, { featured: true })).total).toBe(
      FIXTURE_PRODUCTS.filter((product) => product.featured).length,
    )
    expect((await listProducts(api, { group: 'mate', category: 'yerbas' })).total).toBe(0)
  })

  it('ordena con sort', async () => {
    const { api } = createMockApi()
    const cheapest = await listProducts(api, { sort: 'menor' })
    expect(cheapest.items[0]?.priceArs).toBe(9999)
    const featuredFirst = await listProducts(api, { pageSize: 100 })
    expect(featuredFirst.items[0]?.slug).toBe('mate-imperial-premium')
    expect(featuredFirst.items.findIndex((product) => !product.featured)).toBe(
      FIXTURE_PRODUCTS.filter((product) => product.featured).length,
    )
  })

  it('pagina de a 24 por omisión', async () => {
    const { api } = createMockApi()
    const first = await listProducts(api)
    expect(first).toMatchObject({ page: 1, pageSize: 24, total: 27 })
    expect(first.items).toHaveLength(24)
    const third = await listProducts(api, { page: 3, pageSize: 10 })
    expect(third.items).toHaveLength(7)
  })

  it('responde 422 con el campo si pageSize pasa de 100 o un parámetro no sirve', async () => {
    const { api } = createMockApi()
    await expect(listProducts(api, { pageSize: 101 })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { pageSize: expect.any(String) as unknown },
    })
    const mock = createMockApi()
    const response = await rawRequest(mock, '/products?page=0&group=termos&featured=si')
    expect(response.status).toBe(422)
    const body = (await response.json()) as { errors: { field: string }[] }
    expect(body.errors.map((error) => error.field)).toEqual(['page', 'group', 'featured'])
  })

  it('nunca devuelve productos no publicados', async () => {
    const mock = createMockApi()
    const galleta = mock.db.products.find((product) => product.id === 'prd-galleta')
    if (galleta === undefined) throw new Error('Falta el Mate Galleta')
    galleta.status = 'draft'
    expect((await listProducts(mock.api, { pageSize: 100 })).total).toBe(26)
    expect((await listProducts(mock.api, { ids: 'prd-galleta' })).total).toBe(0)
  })

  it('arma cada producto con código, agotado y precio sin impuestos', async () => {
    const mock = createMockApi()
    const page = await listProducts(mock.api, { ids: 'prd-imperial-premium,prd-galleta' })
    const [imperial, galleta] = page.items
    expect(imperial).toMatchObject({
      code: 'N°01',
      isSoldOut: false,
      netPriceArs: 33057,
      categorySlug: 'imperiales',
      group: 'mate',
      maxQuantity: 12,
    })
    expect(galleta).toMatchObject({ isSoldOut: true, isPurchasable: false, maxQuantity: 0 })

    mock.db.settings.priceDisplay.showNetPrice = false
    const hidden = await listProducts(mock.api, { ids: 'prd-imperial-premium' })
    expect(hidden.items[0]?.netPriceArs).toBeNull()
  })
})

describe('GET /products/{slug}', () => {
  it('arma la ficha del Mate Imperial Premium', async () => {
    const product = await getProduct(createMockApi().api, 'mate-imperial-premium')
    expect(product).toMatchObject({
      code: 'N°01',
      isPurchasable: true,
      netPriceArs: 33057,
      rating: { count: 3 },
    })
    expect(product.tabs.descriptionNote).not.toBeNull()
    expect(product.options?.leathers).toHaveLength(4)
    expect(product.images.map((image) => image.url)).toEqual([
      '/mock-images/mate-imperial-premium.jpg',
      '/mock-images/mate-imperial-premium-2.jpg',
    ])
  })

  it('marca el Mate Galleta como agotado y sin compra', async () => {
    const product = await getProduct(createMockApi().api, 'mate-galleta')
    expect(product).toMatchObject({ isSoldOut: true, isPurchasable: false })
  })

  it('devuelve el precio nulo de un producto a consultar', async () => {
    const product = await getProduct(createMockApi().api, 'mate-torpedo-linea-acero')
    expect(product).toMatchObject({ priceArs: null, netPriceArs: null, isPurchasable: false })
  })

  it('con un slug anterior devuelve el producto con su slug actual', async () => {
    const mock = createMockApi()
    const imperial = mock.db.products.find((product) => product.id === 'prd-imperial-premium')
    if (imperial === undefined) throw new Error('Falta el Imperial Premium')
    imperial.previousSlugs = ['mate-imperial']
    expect((await getProduct(mock.api, 'mate-imperial')).slug).toBe('mate-imperial-premium')
  })

  it('combina las pestañas del grupo con las del producto y deja sin opciones a lo que no es mate', async () => {
    const mock = createMockApi()
    const yerba = mock.db.products.find((product) => product.id === 'prd-yerba-canarias')
    if (yerba === undefined) throw new Error('Falta la yerba')
    yerba.tabsOverride = { materials: 'Yerba con palo.' }
    const product = await getProduct(mock.api, yerba.slug)
    expect(product.options).toBeNull()
    expect(product.tabs).toEqual({
      descriptionNote: mock.db.content.productTabs.yerba.descriptionNote,
      materials: 'Yerba con palo.',
      shipping: mock.db.content.productTabs.shipping,
      care: mock.db.content.productTabs.yerba.care,
    })
  })

  it('responde 404 si no existe o no está publicado y 422 si el slug no tiene formato', async () => {
    const mock = createMockApi()
    const galleta = mock.db.products.find((product) => product.id === 'prd-galleta')
    if (galleta === undefined) throw new Error('Falta el Mate Galleta')
    galleta.status = 'archived'
    await expect(getProduct(mock.api, 'mate-galleta')).rejects.toMatchObject({ status: 404 })
    await expect(getProduct(mock.api, 'no-existe')).rejects.toMatchObject({ status: 404 })
    const response = await rawRequest(mock, '/products/Mate_Galleta')
    expect(response.status).toBe(422)
  })
})

describe('GET /products/{slug}/related', () => {
  it('devuelve 3 imperiales y un mate de otra línea para el Imperial Premium', async () => {
    const related = await listRelatedProducts(createMockApi().api, 'mate-imperial-premium')
    expect(related).toHaveLength(4)
    expect(related.slice(0, 3).every((product) => product.categorySlug === 'imperiales')).toBe(true)
    expect(related[3]).toMatchObject({ group: 'mate' })
    expect(related[3]?.categorySlug).not.toBe('imperiales')
    expect(related.some((product) => product.slug === 'mate-imperial-premium')).toBe(false)
  })

  it('responde 404 si el producto no existe', async () => {
    await expect(listRelatedProducts(createMockApi().api, 'no-existe')).rejects.toMatchObject({
      status: 404,
    })
  })
})
