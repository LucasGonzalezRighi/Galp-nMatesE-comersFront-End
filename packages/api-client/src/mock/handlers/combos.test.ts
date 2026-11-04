import { describe, expect, it } from 'vitest'
import { netPrice, pesos } from '@galpon/domain'
import type { MockApi } from '../../test/mock-api'
import { listCombos } from '../../services'
import { createMockApi } from '../../test/mock-api'
import { createCheckoutApi, placeOrder } from '../test/checkout-api'

/** Producto de la base, para cambiarle precio, stock o estado. */
function product(mock: Pick<MockApi, 'db'>, id: string) {
  const found = mock.db.products.find((candidate) => candidate.id === id)
  if (found === undefined) throw new Error(`Falta el fixture ${id}`)
  return found
}

describe('GET /combos', () => {
  it('trae los 4 publicados por posición, sin el borrador', async () => {
    const combos = await listCombos(createMockApi().api)
    expect(combos.map((combo) => [combo.id, combo.position])).toEqual([
      ['cmb-duo-imperial', 1],
      ['cmb-camionero-y-canarias', 2],
      ['cmb-torpedo-completo', 3],
      ['cmb-bombilla-y-yerba', 4],
    ])
  })

  it('arma "Dúo Imperial" con sus piezas y los datos que calcula con precios y stock vigentes', async () => {
    const mock = createMockApi()
    const [duo] = await listCombos(mock.api)
    const mate = product(mock, 'prd-imperial-premium')
    expect(duo).toEqual({
      id: 'cmb-duo-imperial',
      name: 'Dúo Imperial',
      description: 'El imperial de ceremonia con el bombillón curvo de pico de bronce.',
      items: [
        {
          productId: 'prd-imperial-premium',
          slug: 'mate-imperial-premium',
          name: 'Mate Imperial Premium',
          group: 'mate',
          leathers: ['Negro', 'Marrón', 'Crudo', 'Borravino'],
          unitPriceArs: 39999,
          isPurchasable: true,
          maxQuantity: 12,
          image: mate.images[0],
        },
        {
          productId: 'prd-bombillon-premium-curvo',
          slug: 'bombillon-premium-curvo',
          name: 'Bombillón Premium Curvo',
          group: 'bombilla',
          leathers: [],
          unitPriceArs: 28999,
          isPurchasable: true,
          maxQuantity: 12,
          image: product(mock, 'prd-bombillon-premium-curvo').images[0],
        },
      ],
      priceArs: 61999,
      netPriceArs: netPrice(pesos(61999), 21),
      listPriceArs: 68998,
      savingsArs: 6999,
      isPurchasable: true,
      isSoldOut: false,
      maxQuantity: 12,
      status: 'published',
      position: 1,
    })
  })

  it('un combo con una pieza sin stock viene igual, agotado y sin poder comprarse', async () => {
    const mock = createMockApi()
    product(mock, 'prd-yerba-canarias').stock = 0
    const camionero = (await listCombos(mock.api)).find(
      (combo) => combo.id === 'cmb-camionero-y-canarias',
    )
    expect(camionero).toMatchObject({ isSoldOut: true, isPurchasable: false, maxQuantity: 0 })
    expect(camionero?.items[1]).toMatchObject({ isPurchasable: false, maxQuantity: 0 })
  })

  it('no trae los combos con una pieza en borrador o "a consultar"', async () => {
    const mock = createMockApi()
    product(mock, 'prd-yerba-serena').status = 'draft'
    product(mock, 'prd-yerba-jengibre').priceArs = null
    const ids = (await listCombos(mock.api)).map((combo) => combo.id)
    expect(ids).toEqual(['cmb-duo-imperial', 'cmb-camionero-y-canarias'])
  })

  it('si las piezas bajan de precio el ahorro queda en 0, nunca negativo', async () => {
    const mock = createMockApi()
    product(mock, 'prd-bombillon-premium-curvo').priceArs = 15000
    const [duo] = await listCombos(mock.api)
    expect(duo).toMatchObject({ listPriceArs: 54999, savingsArs: 0, priceArs: 61999 })
  })

  it('el tope de un combo descuenta el stock reservado por los pedidos que esperan el pago', async () => {
    const mock = createCheckoutApi()
    product(mock, 'prd-bombillon-premium-curvo').stock = 5
    await placeOrder(mock, {
      shipping: { method: 'pickup', address: null },
      items: [
        { type: 'product', productId: 'prd-bombillon-premium-curvo', quantity: 2, options: null },
      ],
      expectedTotalArs: 2 * 28999,
    })
    const [duo] = await listCombos(mock.api)
    expect(duo?.maxQuantity).toBe(3)
    expect(duo?.items.map((item) => item.maxQuantity)).toEqual([12, 3])
  })

  it('sin el precio neto en los ajustes, netPriceArs es null', async () => {
    const mock = createMockApi()
    mock.db.settings.priceDisplay.showNetPrice = false
    const [duo] = await listCombos(mock.api)
    expect(duo?.netPriceArs).toBeNull()
  })
})
