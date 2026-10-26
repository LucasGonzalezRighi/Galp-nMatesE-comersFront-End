import { describe, expect, it } from 'vitest'
import { kitLineAmounts, netPrice, pesos } from '@galpon/domain'
import type { CartItemInput } from '../../generated/schema'
import { quoteCart, quoteShipping } from '../../services'
import { createCheckoutApi, placeOrder } from '../test/checkout-api'

const MATE: CartItemInput = {
  type: 'product',
  productId: 'prd-imperial-premium',
  quantity: 1,
  options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
}

const OPTIONS = { leather: 'Negro', ferrule: 'Alpaca cincelada' } as const

const KIT: CartItemInput = {
  type: 'kit',
  mateId: 'prd-imperial-premium',
  bombillaId: 'prd-bombillon-premium-curvo',
  yerbaId: 'prd-yerba-canarias',
  leather: 'Crudo',
  quantity: 2,
}

function priceOf(mock: ReturnType<typeof createCheckoutApi>, id: string) {
  const price = mock.db.products.find((product) => product.id === id)?.priceArs
  if (price === null || price === undefined) throw new Error(`Sin precio: ${id}`)
  return pesos(price)
}

describe('POST /cart/quote', () => {
  it('cotiza un mate con su clave, su detalle y el precio sin impuestos', async () => {
    const mock = createCheckoutApi()
    const quote = await quoteCart(mock.api, { items: [MATE] })
    expect(quote).toEqual({
      lines: [
        {
          key: 'product:prd-imperial-premium:Negro:Alpaca cincelada',
          type: 'product',
          name: 'Mate Imperial Premium',
          detail: 'Cuero negro · Alpaca cincelada',
          unitPriceArs: 39999,
          netUnitPriceArs: netPrice(pesos(39999), 21),
          kitSavingsArs: 0,
          totalArs: 39999,
          maxQuantity: 12,
          issue: null,
        },
      ],
      itemsGrossArs: 39999,
      kitSavingsArs: 0,
      subtotalArs: 39999,
      netSubtotalArs: netPrice(pesos(39999), 21),
    })
  })

  it('cotiza un kit con el descuento de los ajustes y el neto del precio efectivo', async () => {
    const mock = createCheckoutApi()
    const prices = [
      priceOf(mock, 'prd-imperial-premium'),
      priceOf(mock, 'prd-bombillon-premium-curvo'),
      priceOf(mock, 'prd-yerba-canarias'),
    ] as const
    const amounts = kitLineAmounts(prices, 2, 10)
    const quote = await quoteCart(mock.api, { items: [KIT] })
    expect(quote.lines[0]).toMatchObject({
      key: 'kit:prd-imperial-premium:prd-bombillon-premium-curvo:prd-yerba-canarias:Crudo',
      type: 'kit',
      name: 'Kit',
      detail: 'Mate Imperial Premium + Bombillón Premium Curvo + Yerba Canarias 1 kg · Cuero crudo',
      unitPriceArs: prices[0] + prices[1] + prices[2],
      kitSavingsArs: amounts.savingsArs,
      totalArs: amounts.totalArs,
      netUnitPriceArs: netPrice(pesos(amounts.totalArs / 2), 21),
      issue: null,
    })
    expect(quote).toMatchObject({
      itemsGrossArs: amounts.grossArs,
      kitSavingsArs: amounts.savingsArs,
      subtotalArs: amounts.totalArs,
      netSubtotalArs: netPrice(amounts.totalArs, 21),
    })
  })

  it('marca cada problema por línea y deja en 0 las que no se pueden comprar', async () => {
    const mock = createCheckoutApi()
    const quote = await quoteCart(mock.api, {
      items: [
        { type: 'product', productId: 'prd-galleta', quantity: 1, options: OPTIONS },
        { type: 'product', productId: 'prd-coquito-criollo', quantity: 5, options: OPTIONS },
        { type: 'product', productId: 'prd-no-existe', quantity: 1, options: null },
        { type: 'product', productId: 'prd-torpedo-acero', quantity: 1, options: null },
      ],
    })
    expect(quote.lines.map((line) => [line.issue, line.maxQuantity, line.totalArs])).toEqual([
      ['sold_out', 0, 0],
      ['quantity_reduced', 2, 2 * priceOf(mock, 'prd-coquito-criollo')],
      ['unavailable', 0, 0],
      ['unavailable', 0, 0],
    ])
    expect(quote.subtotalArs).toBe(2 * priceOf(mock, 'prd-coquito-criollo'))
  })

  it('el stock de un producto vale para todas las líneas, sueltas y en kits', async () => {
    const mock = createCheckoutApi()
    const coquito = mock.db.products.find((product) => product.id === 'prd-coquito-criollo')
    if (coquito === undefined) throw new Error('Falta el fixture')
    coquito.stock = 3
    const quote = await quoteCart(mock.api, {
      items: [
        { type: 'product', productId: 'prd-coquito-criollo', quantity: 2, options: OPTIONS },
        { ...KIT, mateId: 'prd-coquito-criollo', quantity: 2 },
      ],
    })
    expect(quote.lines.map((line) => [line.issue, line.maxQuantity])).toEqual([
      [null, 3],
      ['quantity_reduced', 1],
    ])
  })

  it('avisa price_changed si el precio no es el que la tienda esperaba', async () => {
    const mock = createCheckoutApi()
    const item: CartItemInput = { ...MATE, expectedUnitPriceArs: 35999 }
    const quote = await quoteCart(mock.api, { items: [item, MATE] })
    expect(quote.lines.map((line) => line.issue)).toEqual(['price_changed', null])
  })

  it('sin precio neto en los ajustes, los netos son null', async () => {
    const mock = createCheckoutApi()
    mock.db.settings.priceDisplay.showNetPrice = false
    const quote = await quoteCart(mock.api, { items: [MATE] })
    expect(quote.netSubtotalArs).toBeNull()
    expect(quote.lines[0]?.netUnitPriceArs).toBeNull()
  })

  it('descuenta el stock reservado por los pedidos que esperan el pago', async () => {
    const mock = createCheckoutApi()
    await placeOrder(mock, {
      items: [{ ...MATE, productId: 'prd-coquito-criollo', quantity: 2 }],
      expectedTotalArs: 2 * priceOf(mock, 'prd-coquito-criollo') + 6500,
    })
    const quote = await quoteCart(mock.api, {
      items: [{ ...MATE, productId: 'prd-coquito-criollo' }],
    })
    expect(quote.lines[0]?.issue).toBe('sold_out')
  })

  it('responde 422 sin líneas o con un mate sin cuero ni virola', async () => {
    const mock = createCheckoutApi()
    await expect(quoteCart(mock.api, { items: [] })).rejects.toMatchObject({ status: 422 })
    await expect(
      quoteCart(mock.api, { items: [{ ...MATE, options: null }] }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { 'items.0.options': expect.any(String) as unknown },
    })
  })
})

describe('POST /shipping/quote', () => {
  it('devuelve el costo y el plazo fijos del método según los ajustes', async () => {
    const mock = createCheckoutApi()
    await expect(
      quoteShipping(mock.api, { method: 'home', postalCode: 'C1043', items: [MATE] }),
    ).resolves.toEqual({ method: 'home', costArs: 6500, eta: '3 a 6 días hábiles' })
    await expect(
      quoteShipping(mock.api, { method: 'pickup', postalCode: null, items: [MATE] }),
    ).resolves.toEqual({ method: 'pickup', costArs: 0, eta: 'Coordinamos por mail' })
  })

  it('pide el código postal salvo en el retiro y rechaza un método deshabilitado', async () => {
    const mock = createCheckoutApi()
    await expect(
      quoteShipping(mock.api, { method: 'branch', postalCode: null, items: [MATE] }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { postalCode: expect.any(String) as unknown },
    })
    const branch = mock.db.settings.shippingOptions.find((option) => option.method === 'branch')
    if (branch === undefined) throw new Error('Falta el fixture')
    branch.enabled = false
    await expect(
      quoteShipping(mock.api, { method: 'branch', postalCode: '8300', items: [MATE] }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { method: expect.any(String) as unknown } })
  })
})
