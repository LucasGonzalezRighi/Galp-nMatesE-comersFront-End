import { describe, expect, it } from 'vitest'
import type { ComboInput } from '../../generated/schema'
import {
  createAdminCombo,
  deleteAdminCombo,
  listAdminCombos,
  listCombos,
  reorderAdminCombos,
  updateAdminCombo,
} from '../../services'
import { createMockApi, loginAsAdmin } from '../../test/mock-api'

/** Ids de los 5 combos de fábrica, en su orden (el último es el borrador). */
const COMBO_IDS = [
  'cmb-duo-imperial',
  'cmb-camionero-y-canarias',
  'cmb-torpedo-completo',
  'cmb-bombilla-y-yerba',
  'cmb-galleta-y-canarias',
]

/** Combo válido para el formulario del dashboard: Imperial Premium + Yerba Canarias ($49.998). */
function comboInput(overrides: Partial<ComboInput> = {}): ComboInput {
  return {
    name: '  Imperial y Canarias  ',
    description: 'Para arrancar la ronda.',
    productIds: ['prd-imperial-premium', 'prd-yerba-canarias'],
    priceArs: 44999,
    status: 'published',
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

describe('GET /admin/combos', () => {
  it('devuelve todos los combos por posición, también el borrador', async () => {
    const mock = await adminApi()
    const combos = await listAdminCombos(mock.api)
    expect(combos.map((combo) => combo.id)).toEqual(COMBO_IDS)
    expect(combos[4]).toMatchObject({
      name: 'Galleta y Canarias',
      status: 'draft',
      position: 5,
      priceArs: 33999,
      listPriceArs: 37998,
      savingsArs: 3999,
      isPurchasable: false,
      isSoldOut: true,
    })
  })

  it('sin sesión responde 401', async () => {
    await expect(listAdminCombos(createMockApi().api)).rejects.toMatchObject({ status: 401 })
  })
})

describe('POST /admin/combos', () => {
  it('crea el combo al final, recortado, y avisa a la tienda', async () => {
    const mock = await adminApi()
    const created = await createAdminCombo(mock.api, comboInput())
    expect(created).toMatchObject({
      name: 'Imperial y Canarias',
      position: 6,
      priceArs: 44999,
      listPriceArs: 49998,
      savingsArs: 4999,
      status: 'published',
      isPurchasable: true,
    })
    expect(created.id).toMatch(/^cmb-/)
    expect(created.items.map((item) => item.productId)).toEqual([
      'prd-imperial-premium',
      'prd-yerba-canarias',
    ])
    expect(mock.invalidated).toEqual([['combos']])
    expect((await listCombos(mock.api)).at(-1)?.id).toBe(created.id)
  })

  it('sin el token CSRF responde 403 y no crea nada', async () => {
    const mock = await adminApi()
    mock.setCsrfToken(undefined)
    await expect(createAdminCombo(mock.api, comboInput())).rejects.toMatchObject({ status: 403 })
    expect(mock.db.combos).toHaveLength(5)
  })

  it('con un solo producto responde 422 con el mensaje del formulario', async () => {
    const mock = await adminApi()
    await expect(
      createAdminCombo(mock.api, comboInput({ productIds: ['prd-imperial-premium'] })),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { productIds: 'Cargá de 2 a 3 productos' },
    })
  })

  it('un producto que no existe, en borrador o "a consultar" da 422 en su lugar', async () => {
    const mock = await adminApi()
    const serena = mock.db.products.find((product) => product.id === 'prd-yerba-serena')
    if (serena === undefined) throw new Error('Falta el fixture')
    serena.status = 'draft'
    await expect(
      createAdminCombo(
        mock.api,
        comboInput({ productIds: ['prd-no-existe', 'prd-torpedo-acero', 'prd-yerba-serena'] }),
      ),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: {
        'productIds.0': 'Elegí un producto publicado y con precio',
        'productIds.1': 'Elegí un producto publicado y con precio',
        'productIds.2': 'Elegí un producto publicado y con precio',
      },
    })
  })

  it('dos productos del mismo grupo y un precio que no es menor que la suma dan 422 en cada campo', async () => {
    const mock = await adminApi()
    await expect(
      createAdminCombo(
        mock.api,
        comboInput({ productIds: ['prd-yerba-canarias', 'prd-yerba-serena'], priceArs: 22499 }),
      ),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: {
        productIds: 'Elegí productos de grupos distintos',
        priceArs: 'El precio del combo tiene que ser menor que la suma de los productos ($22.499)',
      },
    })
  })

  it('el precio igual a la suma de "Dúo Imperial" da 422 con la suma de $68.998', async () => {
    const mock = await adminApi()
    await expect(
      createAdminCombo(
        mock.api,
        comboInput({
          productIds: ['prd-imperial-premium', 'prd-bombillon-premium-curvo'],
          priceArs: 68998,
        }),
      ),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: {
        priceArs: 'El precio del combo tiene que ser menor que la suma de los productos ($68.998)',
      },
    })
    expect(mock.invalidated).toEqual([])
  })
})

describe('PATCH /admin/combos/{id}', () => {
  it('reemplaza el combo, conserva su lugar y avisa a la tienda', async () => {
    const mock = await adminApi()
    const updated = await updateAdminCombo(
      mock.api,
      'cmb-duo-imperial',
      comboInput({ name: 'Dúo Imperial', status: 'draft' }),
    )
    expect(updated).toMatchObject({
      id: 'cmb-duo-imperial',
      name: 'Dúo Imperial',
      status: 'draft',
      position: 1,
      priceArs: 44999,
    })
    expect(mock.invalidated).toEqual([['combos']])
    expect((await listCombos(mock.api)).map((combo) => combo.id)).not.toContain('cmb-duo-imperial')
  })

  it('un combo que no existe responde 404', async () => {
    const mock = await adminApi()
    await expect(updateAdminCombo(mock.api, 'cmb-no-existe', comboInput())).rejects.toMatchObject({
      status: 404,
    })
  })
})

describe('DELETE /admin/combos/{id}', () => {
  it('borra el combo, renumera los demás y avisa a la tienda', async () => {
    const mock = await adminApi()
    await deleteAdminCombo(mock.api, 'cmb-camionero-y-canarias')
    const combos = await listAdminCombos(mock.api)
    expect(combos.map((combo) => [combo.id, combo.position])).toEqual([
      ['cmb-duo-imperial', 1],
      ['cmb-torpedo-completo', 2],
      ['cmb-bombilla-y-yerba', 3],
      ['cmb-galleta-y-canarias', 4],
    ])
    expect(mock.invalidated).toEqual([['combos']])
  })

  it('un combo que no existe responde 404', async () => {
    const mock = await adminApi()
    await expect(deleteAdminCombo(mock.api, 'cmb-no-existe')).rejects.toMatchObject({
      status: 404,
    })
  })
})

describe('PUT /admin/combos/order', () => {
  it('guarda el orden nuevo, que la tienda usa', async () => {
    const mock = await adminApi()
    const reversed = [...COMBO_IDS].reverse()
    await reorderAdminCombos(mock.api, reversed)
    expect((await listAdminCombos(mock.api)).map((combo) => combo.id)).toEqual(reversed)
    expect((await listCombos(mock.api)).map((combo) => combo.position)).toEqual([2, 3, 4, 5])
    expect(mock.invalidated).toEqual([['combos']])
  })

  it.each([[COMBO_IDS.slice(1)], [[...COMBO_IDS.slice(1), 'cmb-no-existe']]])(
    'sin todos los combos responde 422 (%j)',
    async (ids) => {
      const mock = await adminApi()
      await expect(reorderAdminCombos(mock.api, ids)).rejects.toMatchObject({
        status: 422,
        fieldErrors: { ids: 'El orden tiene que tener todos los combos, una vez cada uno.' },
      })
    },
  )
})
