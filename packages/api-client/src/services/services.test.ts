import { describe, expect, it } from 'vitest'
import type { ApiClient } from '../client'
import {
  adminLogin,
  adminLogout,
  getAboutContent,
  getAdminCsrfToken,
  getAdminSession,
  getFaqContent,
  getFooterContent,
  getHomeContent,
  getLegalContent,
  getProduct,
  getProductTabsContent,
  getPublicSettings,
  listAdminProducts,
  listAllProducts,
  listCategories,
  listFeaturedReviews,
  listProductReviews,
  listProducts,
  listRelatedProducts,
} from '.'
import { createApiClient } from '../client'
import { createFakeFetch, jsonResponse, problemResponse } from '../test/fake-fetch'

const BODY = { marker: 'respuesta' }

/** Cliente contra un `fetch` falso que contesta siempre con el mismo cuerpo. */
function setup(body: unknown = BODY, status = 200) {
  const { fetch, requests } = createFakeFetch(() => jsonResponse(body, status))
  const api = createApiClient({ baseUrl: 'http://x/api/v1', fetch })
  return { api, requests }
}

/** El único pedido que se hizo, ya con la URL separada en partes. */
function onlyRequest(requests: Request[]) {
  expect(requests).toHaveLength(1)
  const request = requests[0]
  if (request === undefined) throw new Error('No se hizo ningún pedido')
  const url = new URL(request.url)
  return { request, path: url.pathname, query: Object.fromEntries(url.searchParams) }
}

interface ReadCase {
  name: string
  run: (api: ApiClient) => Promise<unknown>
  path: string
}

const readCases: ReadCase[] = [
  { name: 'listCategories', run: (api) => listCategories(api), path: '/api/v1/categories' },
  {
    name: 'getProduct',
    run: (api) => getProduct(api, 'mate-uno'),
    path: '/api/v1/products/mate-uno',
  },
  {
    name: 'listRelatedProducts',
    run: (api) => listRelatedProducts(api, 'mate-uno'),
    path: '/api/v1/products/mate-uno/related',
  },
  {
    name: 'listFeaturedReviews',
    run: (api) => listFeaturedReviews(api),
    path: '/api/v1/reviews/featured',
  },
  { name: 'getHomeContent', run: (api) => getHomeContent(api), path: '/api/v1/content/home' },
  { name: 'getAboutContent', run: (api) => getAboutContent(api), path: '/api/v1/content/about' },
  { name: 'getFaqContent', run: (api) => getFaqContent(api), path: '/api/v1/content/faq' },
  { name: 'getFooterContent', run: (api) => getFooterContent(api), path: '/api/v1/content/footer' },
  {
    name: 'getProductTabsContent',
    run: (api) => getProductTabsContent(api),
    path: '/api/v1/content/product-tabs',
  },
  {
    name: 'getLegalContent (terms)',
    run: (api) => getLegalContent(api, 'terms'),
    path: '/api/v1/content/legal/terms',
  },
  {
    name: 'getLegalContent (privacy)',
    run: (api) => getLegalContent(api, 'privacy'),
    path: '/api/v1/content/legal/privacy',
  },
  {
    name: 'getPublicSettings',
    run: (api) => getPublicSettings(api),
    path: '/api/v1/settings/public',
  },
  { name: 'getAdminSession', run: (api) => getAdminSession(api), path: '/api/v1/admin/auth/me' },
  {
    name: 'getAdminCsrfToken',
    run: (api) => getAdminCsrfToken(api),
    path: '/api/v1/admin/auth/csrf',
  },
]

describe('lecturas sin parámetros', () => {
  it.each(readCases)('$name pide GET $path y devuelve el cuerpo', async ({ run, path }) => {
    const { api, requests } = setup()
    await expect(run(api)).resolves.toEqual(BODY)
    const sent = onlyRequest(requests)
    expect(sent.request.method).toBe('GET')
    expect(sent.path).toBe(path)
    expect(sent.query).toEqual({})
  })
})

describe('catálogo', () => {
  it('listProducts manda los filtros como query', async () => {
    const { api, requests } = setup()
    await listProducts(api, { q: 'té', featured: true, group: 'mate', page: 2, sort: 'az' })
    const sent = onlyRequest(requests)
    expect(sent.path).toBe('/api/v1/products')
    expect(sent.query).toEqual({ q: 'té', featured: 'true', group: 'mate', page: '2', sort: 'az' })
  })

  it('listProducts sin filtros no manda query', async () => {
    const { api, requests } = setup()
    await listProducts(api)
    expect(onlyRequest(requests).query).toEqual({})
  })

  it('listAllProducts con total 150 pide las páginas 1 y 2 de 100 y junta los 150', async () => {
    const items = Array.from({ length: 150 }, (_, index) => ({ id: `prd-${String(index)}` }))
    const { fetch, requests } = createFakeFetch((request) => {
      const page = Number(new URL(request.url).searchParams.get('page'))
      return jsonResponse({
        items: items.slice((page - 1) * 100, page * 100),
        page,
        pageSize: 100,
        total: 150,
      })
    })
    const api = createApiClient({ baseUrl: 'http://x/api/v1', fetch })
    const all = await listAllProducts(api, { group: 'mate' })
    expect(all).toEqual(items)
    expect(requests.map((request) => new URL(request.url).search)).toEqual([
      '?group=mate&page=1&pageSize=100',
      '?group=mate&page=2&pageSize=100',
    ])
  })

  it('listAllProducts con una sola página hace un solo pedido', async () => {
    const { api, requests } = setup({ items: [{ id: 'a' }], page: 1, pageSize: 100, total: 1 })
    await expect(listAllProducts(api)).resolves.toEqual([{ id: 'a' }])
    expect(onlyRequest(requests).query).toEqual({ page: '1', pageSize: '100' })
  })

  it('listAllProducts corta si una página llega vacía aunque el total diga que faltan', async () => {
    const { api, requests } = setup({ items: [], page: 1, pageSize: 100, total: 500 })
    await expect(listAllProducts(api)).resolves.toEqual([])
    expect(requests).toHaveLength(1)
  })

  it('listAllProducts propaga el error de una página', async () => {
    const { fetch } = createFakeFetch((_request, index) =>
      index === 0
        ? jsonResponse({ items: [{ id: 'a' }], page: 1, pageSize: 100, total: 150 })
        : problemResponse(429, undefined, { 'Retry-After': '5' }),
    )
    const api = createApiClient({ baseUrl: 'http://x/api/v1', fetch })
    await expect(listAllProducts(api)).rejects.toMatchObject({
      kind: 'rate_limited',
      retryAfterSeconds: 5,
    })
  })

  it('getProduct codifica el slug en la ruta', async () => {
    const { api, requests } = setup()
    await getProduct(api, 'a b')
    expect(onlyRequest(requests).request.url).toBe('http://x/api/v1/products/a%20b')
  })

  it('un 404 de getProduct llega como ApiError "not_found"', async () => {
    const { api } = setup({ type: 'not_found', title: 'No existe', status: 404 }, 404)
    await expect(getProduct(api, 'inexistente')).rejects.toMatchObject({
      kind: 'not_found',
      status: 404,
    })
  })
})

describe('reseñas', () => {
  it('listProductReviews sin página no manda query', async () => {
    const { api, requests } = setup()
    await listProductReviews(api, 'mate-uno')
    const sent = onlyRequest(requests)
    expect(sent.path).toBe('/api/v1/products/mate-uno/reviews')
    expect(sent.query).toEqual({})
  })

  it('listProductReviews manda la página', async () => {
    const { api, requests } = setup()
    await listProductReviews(api, 'mate-uno', 3)
    expect(onlyRequest(requests).query).toEqual({ page: '3' })
  })
})

describe('admin', () => {
  it('adminLogin manda POST con el email y la contraseña', async () => {
    const result = {
      csrfToken: 'tok',
      email: 'admin@galpon.test',
      expiresAt: '2026-10-21T01:00:00Z',
    }
    const { api, requests } = setup(result)
    await expect(
      adminLogin(api, { email: 'admin@galpon.test', password: 'secreto' }),
    ).resolves.toEqual(result)
    const sent = onlyRequest(requests)
    expect(sent.request.method).toBe('POST')
    expect(sent.path).toBe('/api/v1/admin/auth/login')
    expect(sent.request.headers.get('Content-Type')).toBe('application/json')
    await expect(sent.request.json()).resolves.toEqual({
      email: 'admin@galpon.test',
      password: 'secreto',
    })
  })

  it('adminLogin con credenciales incorrectas es un ApiError "unauthorized"', async () => {
    const { api } = setup(
      { type: 'invalid_credentials', title: 'Credenciales incorrectas', status: 401 },
      401,
    )
    await expect(adminLogin(api, { email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      kind: 'unauthorized',
    })
  })

  it('adminLogout manda POST y con 204 resuelve undefined', async () => {
    const { fetch, requests } = createFakeFetch(() => new Response(null, { status: 204 }))
    const api = createApiClient({ baseUrl: 'http://x/api/v1', fetch })
    await expect(adminLogout(api)).resolves.toBeUndefined()
    const sent = onlyRequest(requests)
    expect(sent.request.method).toBe('POST')
    expect(sent.path).toBe('/api/v1/admin/auth/logout')
  })

  it('listAdminProducts manda los filtros como query', async () => {
    const { api, requests } = setup()
    await listAdminProducts(api, { status: 'draft', stock: 'out', page: 2, pageSize: 10 })
    const sent = onlyRequest(requests)
    expect(sent.path).toBe('/api/v1/admin/products')
    expect(sent.query).toEqual({ status: 'draft', stock: 'out', page: '2', pageSize: '10' })
  })

  it('listAdminProducts sin filtros no manda query', async () => {
    const { api, requests } = setup()
    await listAdminProducts(api)
    expect(onlyRequest(requests).query).toEqual({})
  })
})

describe('validación de entradas', () => {
  const { api } = setup()

  it.each([[''], ['   ']])('rechaza un slug vacío (%j)', async (slug) => {
    await expect(getProduct(api, slug)).rejects.toThrow(
      new RangeError('El slug del producto no puede estar vacío'),
    )
    await expect(listRelatedProducts(api, slug)).rejects.toThrow(RangeError)
    await expect(listProductReviews(api, slug)).rejects.toThrow(RangeError)
  })

  it.each([[0], [-1], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'listProductReviews rechaza la página %j',
    async (page) => {
      await expect(listProductReviews(api, 'mate-uno', page)).rejects.toThrow(
        new RangeError('La página tiene que ser un entero mayor o igual a 1'),
      )
    },
  )

  it('getLegalContent rechaza un documento que no existe', async () => {
    const document = 'cookies' as unknown as 'terms'
    await expect(getLegalContent(api, document)).rejects.toThrow(
      new RangeError('El documento legal tiene que ser "terms" o "privacy", y recibió "cookies"'),
    )
  })
})
