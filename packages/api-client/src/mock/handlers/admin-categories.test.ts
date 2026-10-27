import { describe, expect, it } from 'vitest'
import type { CategoryInput } from '../../generated/schema'
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  reorderAdminCategories,
  updateAdminCategory,
} from '../../services'
import { createMockApi, loginAsAdmin } from '../../test/mock-api'

/** Ids de las 6 líneas de fábrica, en su orden. */
const CATEGORY_IDS = [
  'cat-imperiales',
  'cat-torpedos',
  'cat-camioneros',
  'cat-ranchero',
  'cat-bombillones',
  'cat-yerbas',
]

/** Línea válida para el formulario del dashboard, sin foto. */
function categoryInput(overrides: Partial<CategoryInput> = {}): CategoryInput {
  return {
    name: 'Calabazas',
    slug: 'calabazas',
    group: 'mate',
    blurb: '  Mates de calabaza curada.  ',
    image: null,
    ...overrides,
  }
}

/** API simulada con sesión y registro de las invalidaciones. */
async function adminApi() {
  const invalidated: string[][] = []
  const mock = createMockApi({ onInvalidate: (tags) => invalidated.push([...tags]) })
  await loginAsAdmin(mock)
  return { ...mock, invalidated }
}

describe('GET /admin/categories', () => {
  it('devuelve las líneas por posición con la cantidad de productos publicados', async () => {
    const mock = await adminApi()
    const categories = await listAdminCategories(mock.api)
    expect(categories.map((category) => category.id)).toEqual(CATEGORY_IDS)
    expect(categories[1]).toMatchObject({ slug: 'torpedos', position: 2, productCount: 6 })
  })

  it('sin sesión responde 401', async () => {
    await expect(listAdminCategories(createMockApi().api)).rejects.toMatchObject({ status: 401 })
  })
})

describe('POST /admin/categories', () => {
  it('crea la línea al final, con la foto conocida por la base simulada', async () => {
    const mock = await adminApi()
    const dataUrl = 'data:image/png;base64,iVBORw=='
    mock.db.media['galpon/lineas/mock-1'] = {
      url: dataUrl,
      width: 1000,
      height: 800,
      createdAt: '2026-10-27T15:00:00Z',
    }
    const created = await createAdminCategory(
      mock.api,
      categoryInput({
        image: { publicId: 'galpon/lineas/mock-1', width: 1000, height: 800, alt: 'Calabazas' },
      }),
    )
    expect(created).toMatchObject({
      slug: 'calabazas',
      name: 'Calabazas',
      blurb: 'Mates de calabaza curada.',
      position: 7,
      productCount: 0,
      image: { publicId: 'galpon/lineas/mock-1', url: dataUrl, alt: 'Calabazas' },
    })
    expect(mock.invalidated).toEqual([['categories']])
    expect((await listAdminCategories(mock.api)).at(-1)?.id).toBe(created.id)
  })

  it('responde 409 slug_taken si otra línea usa el slug', async () => {
    const mock = await adminApi()
    await expect(
      createAdminCategory(mock.api, categoryInput({ slug: 'torpedos' })),
    ).rejects.toMatchObject({ status: 409, problem: { type: 'slug_taken' } })
  })

  it('responde 422 si un campo no sirve o la foto no existe', async () => {
    const mock = await adminApi()
    await expect(createAdminCategory(mock.api, categoryInput({ name: '' }))).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: 'Requerido' },
    })
    await expect(
      createAdminCategory(
        mock.api,
        categoryInput({
          image: { publicId: 'galpon/lineas/no-existe', width: 900, height: 900, alt: 'Foto' },
        }),
      ),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { 'image.publicId': 'La foto no existe: subila de nuevo' },
    })
    expect(mock.db.categories).toHaveLength(6)
  })
})

describe('PATCH /admin/categories/{id}', () => {
  it('guarda los cambios y conserva su propio slug y su foto', async () => {
    const mock = await adminApi()
    const updated = await updateAdminCategory(
      mock.api,
      'cat-imperiales',
      categoryInput({
        name: 'Imperiales de alpaca',
        slug: 'imperiales',
        image: {
          publicId: 'galpon/productos/mate-imperial-premium',
          width: 960,
          height: 1280,
          alt: 'Imperial',
        },
      }),
    )
    expect(updated).toMatchObject({
      id: 'cat-imperiales',
      name: 'Imperiales de alpaca',
      slug: 'imperiales',
      position: 1,
      image: { url: '/mock-images/mate-imperial-premium.jpg', alt: 'Imperial' },
    })
    expect(mock.invalidated[0]).toContain('categories')
  })

  it('responde 409 si el slug es de otra línea y 404 si la línea no existe', async () => {
    const mock = await adminApi()
    await expect(
      updateAdminCategory(mock.api, 'cat-imperiales', categoryInput({ slug: 'torpedos' })),
    ).rejects.toMatchObject({ status: 409, problem: { type: 'slug_taken' } })
    await expect(
      updateAdminCategory(mock.api, 'cat-no-existe', categoryInput()),
    ).rejects.toMatchObject({ status: 404 })
  })
})

describe('DELETE /admin/categories/{id}', () => {
  it('responde 409 category_has_products si tiene productos, aunque estén archivados', async () => {
    const mock = await adminApi()
    for (const product of mock.db.products) {
      if (product.categoryId === 'cat-yerbas') product.status = 'archived'
    }
    await expect(deleteAdminCategory(mock.api, 'cat-yerbas')).rejects.toMatchObject({
      status: 409,
      problem: { type: 'category_has_products' },
    })
    expect(mock.db.categories).toHaveLength(6)
  })

  it('borra una línea vacía y renumera las posiciones', async () => {
    const mock = await adminApi()
    for (const product of mock.db.products) {
      if (product.categoryId === 'cat-torpedos') product.categoryId = 'cat-imperiales'
    }
    await deleteAdminCategory(mock.api, 'cat-torpedos')
    const categories = await listAdminCategories(mock.api)
    expect(categories.map((category) => [category.id, category.position])).toEqual([
      ['cat-imperiales', 1],
      ['cat-camioneros', 2],
      ['cat-ranchero', 3],
      ['cat-bombillones', 4],
      ['cat-yerbas', 5],
    ])
    expect(mock.invalidated).toEqual([['categories']])
    await expect(deleteAdminCategory(mock.api, 'cat-torpedos')).rejects.toMatchObject({
      status: 404,
    })
  })
})

describe('PUT /admin/categories/order', () => {
  it('guarda el orden nuevo', async () => {
    const mock = await adminApi()
    const reversed = [...CATEGORY_IDS].reverse()
    await reorderAdminCategories(mock.api, reversed)
    const categories = await listAdminCategories(mock.api)
    expect(categories.map((category) => category.id)).toEqual(reversed)
    expect(categories.map((category) => category.position)).toEqual([1, 2, 3, 4, 5, 6])
    expect(mock.invalidated).toEqual([['categories']])
  })

  it.each([
    ['incompletos', CATEGORY_IDS.slice(1)],
    ['con uno que no existe', [...CATEGORY_IDS.slice(1), 'cat-otra']],
    ['repetidos', [...CATEGORY_IDS.slice(1), 'cat-torpedos']],
  ])('responde 422 en ids con ids %s', async (_description, ids) => {
    const mock = await adminApi()
    await expect(reorderAdminCategories(mock.api, ids)).rejects.toMatchObject({
      status: 422,
      fieldErrors: { ids: expect.any(String) as unknown },
    })
    expect(mock.db.categories.map((category) => category.position)).toEqual([1, 2, 3, 4, 5, 6])
  })
})
