import { describe, expect, it } from 'vitest'
import { kitLineAmounts, netPrice, pesos } from '@galpon/domain'
import type { CartItemInput } from '../../generated/schema'
import { quoteCart, quoteShipping } from '../../services'
import { createCheckoutApi, placeOrder } from '../test/checkout-api'

const MATE: CartItemInput = {
  type: 'product',
  productId: 'prd-imperial-premium',
  quantity: 1,
  options: { leather: 'Negro' },
}

const OPTIONS = { leather: 'Negro' } as const

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
          key: 'product:prd-imperial-premium:Negro',
          type: 'product',
          name: 'Mate Imperial Premium',
          detail: 'Color negro',
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
      detail: 'Mate Imperial Premium + Bombillón Premium Curvo + Yerba Canarias 1 kg · Color crudo',
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

  it('responde 422 sin líneas o con un mate con cueros que llega sin cuero', async () => {
    const mock = createCheckoutApi()
    await expect(quoteCart(mock.api, { items: [] })).rejects.toMatchObject({ status: 422 })
    await expect(
      quoteCart(mock.api, { items: [{ ...MATE, options: null }] }),
    ).rejects.toMatchObject({
      status: 422,
      problem: {
        errors: [
          { field: 'items.0.options', code: 'required', message: 'Elegí el color del mate.' },
        ],
      },
    })
  })

  it('responde 422 si el cuero no es uno de los que ofrece el mate, y junta los errores', async () => {
    const mock = createCheckoutApi()
    const mate = mock.db.products.find((product) => product.id === 'prd-imperial-premium')
    if (mate === undefined) throw new Error('Falta el fixture')
    mate.leathers = ['Marrón', 'Crudo']
    await expect(
      quoteCart(mock.api, {
        items: [MATE, { ...KIT, leather: 'Borravino' }, { ...KIT, leather: null }],
      }),
    ).rejects.toMatchObject({
      status: 422,
      problem: {
        errors: [
          {
            field: 'items.0.options.leather',
            code: 'leather_not_offered',
            message: 'Ese color no está disponible para este mate.',
          },
          {
            field: 'items.1.leather',
            code: 'leather_not_offered',
            message: 'Ese color no está disponible para este mate.',
          },
          { field: 'items.2.leather', code: 'required', message: 'Elegí el color del mate.' },
        ],
      },
    })
  })

  it('un producto sin cueros ignora el cuero, y la clave repite lo que mandó la tienda', async () => {
    const mock = createCheckoutApi()
    const quote = await quoteCart(mock.api, {
      items: [
        { type: 'product', productId: 'prd-yerba-canarias', quantity: 1, options: null },
        { type: 'product', productId: 'prd-yerba-canarias', quantity: 1, options: OPTIONS },
      ],
    })
    expect(quote.lines.map((line) => [line.key, line.detail, line.issue])).toEqual([
      ['product:prd-yerba-canarias:-', '', null],
      ['product:prd-yerba-canarias:Negro', '', null],
    ])
  })

  it('un mate sin cueros no pide cuero: ni suelto ni en un kit', async () => {
    const mock = createCheckoutApi()
    const mate = mock.db.products.find((product) => product.id === 'prd-imperial-premium')
    if (mate === undefined) throw new Error('Falta el fixture')
    mate.leathers = []
    const quote = await quoteCart(mock.api, {
      items: [
        { ...MATE, options: null },
        { ...KIT, leather: null },
      ],
    })
    expect(quote.lines.map((line) => [line.key, line.detail, line.issue])).toEqual([
      ['product:prd-imperial-premium:-', '', null],
      [
        'kit:prd-imperial-premium:prd-bombillon-premium-curvo:prd-yerba-canarias:-',
        'Mate Imperial Premium + Bombillón Premium Curvo + Yerba Canarias 1 kg',
        null,
      ],
    ])
  })

  it('un producto que no se vende sale unavailable sin error de cuero', async () => {
    const mock = createCheckoutApi()
    const mate = mock.db.products.find((product) => product.id === 'prd-imperial-premium')
    if (mate === undefined) throw new Error('Falta el fixture')
    mate.status = 'draft'
    const quote = await quoteCart(mock.api, {
      items: [
        { ...MATE, options: null },
        { ...KIT, leather: null },
      ],
    })
    expect(quote.lines.map((line) => line.issue)).toEqual(['unavailable', 'unavailable'])
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

describe('POST /cart/quote con combos', () => {
  /** "Dúo Imperial": Mate Imperial Premium ($39.999) + Bombillón Premium Curvo ($28.999), a $61.999. */
  const DUO: CartItemInput = {
    type: 'combo',
    comboId: 'cmb-duo-imperial',
    quantity: 2,
    options: { leather: 'Marrón' },
  }

  /** "Bombilla y yerba": sin mate, a $34.999. */
  const NO_MATE: CartItemInput = {
    type: 'combo',
    comboId: 'cmb-bombilla-y-yerba',
    quantity: 1,
    options: null,
  }

  function product(mock: ReturnType<typeof createCheckoutApi>, id: string) {
    const found = mock.db.products.find((candidate) => candidate.id === id)
    if (found === undefined) throw new Error(`Falta el fixture ${id}`)
    return found
  }

  it('"Dúo Imperial" × 2 cotiza lista 68.998, ahorro 13.998 y total 123.998, con su clave y su detalle', async () => {
    const mock = createCheckoutApi()
    const quote = await quoteCart(mock.api, { items: [DUO] })
    expect(quote).toEqual({
      lines: [
        {
          key: 'combo:cmb-duo-imperial:Marrón',
          type: 'combo',
          name: 'Dúo Imperial',
          detail: 'Mate Imperial Premium + Bombillón Premium Curvo · Color marrón',
          unitPriceArs: 68998,
          netUnitPriceArs: netPrice(pesos(61999), 21),
          kitSavingsArs: 13998,
          totalArs: 123998,
          maxQuantity: 12,
          issue: null,
        },
      ],
      itemsGrossArs: 137996,
      kitSavingsArs: 13998,
      subtotalArs: 123998,
      netSubtotalArs: netPrice(pesos(123998), 21),
    })
  })

  it('un combo sin mate no pide cuero y lo ignora si viene, con la clave que mandó la tienda', async () => {
    const mock = createCheckoutApi()
    const quote = await quoteCart(mock.api, {
      items: [NO_MATE, { ...NO_MATE, options: { leather: 'Negro' } }],
    })
    expect(quote.lines.map((line) => [line.key, line.detail, line.totalArs])).toEqual([
      [
        'combo:cmb-bombilla-y-yerba:-',
        'Bombillón 100% Alpaca + Yerba Canarias Té y Jengibre 1 kg',
        34999,
      ],
      [
        'combo:cmb-bombilla-y-yerba:Negro',
        'Bombillón 100% Alpaca + Yerba Canarias Té y Jengibre 1 kg',
        34999,
      ],
    ])
  })

  it('si las piezas bajan y suman menos que el combo, cobra el combo sin ahorro', async () => {
    const mock = createCheckoutApi()
    product(mock, 'prd-bombillon-premium-curvo').priceArs = 15000
    const quote = await quoteCart(mock.api, { items: [{ ...DUO, expectedUnitPriceArs: 61999 }] })
    expect(quote.lines[0]).toMatchObject({
      unitPriceArs: 61999,
      kitSavingsArs: 0,
      totalArs: 123998,
      issue: null,
    })
  })

  it('el combo dado de baja, en borrador o con una pieza que no se vende queda unavailable', async () => {
    const mock = createCheckoutApi()
    product(mock, 'prd-yerba-serena').status = 'draft'
    const quote = await quoteCart(mock.api, {
      items: [
        { ...NO_MATE, comboId: 'cmb-no-existe' },
        { ...NO_MATE, comboId: 'cmb-galleta-y-canarias', options: null },
        { ...DUO, comboId: 'cmb-torpedo-completo', quantity: 1 },
      ],
    })
    expect(quote.lines.map((line) => [line.name, line.issue, line.totalArs])).toEqual([
      ['Combo no disponible', 'unavailable', 0],
      ['Galleta y Canarias', 'unavailable', 0],
      ['Torpedo completo', 'unavailable', 0],
    ])
    expect(quote.subtotalArs).toBe(0)
  })

  it('una pieza sin stock deja el combo sold_out', async () => {
    const mock = createCheckoutApi()
    product(mock, 'prd-bombillon-premium-curvo').stock = 0
    const quote = await quoteCart(mock.api, { items: [DUO] })
    expect(quote.lines[0]).toMatchObject({ issue: 'sold_out', maxQuantity: 0, totalArs: 0 })
  })

  it('el stock de cada pieza se comparte con los productos sueltos, los kits y otros combos', async () => {
    const mock = createCheckoutApi()
    product(mock, 'prd-imperial-premium').stock = 5
    const quote = await quoteCart(mock.api, {
      items: [
        { ...MATE, quantity: 2 },
        { ...KIT, quantity: 1 },
        DUO,
        { ...DUO, options: { leather: 'Negro' } },
      ],
    })
    expect(quote.lines.map((line) => [line.issue, line.maxQuantity])).toEqual([
      [null, 5],
      [null, 3],
      [null, 2],
      ['sold_out', 0],
    ])
  })

  it('reduce la cantidad si no alcanza el stock de una pieza', async () => {
    const mock = createCheckoutApi()
    product(mock, 'prd-bombillon-premium-curvo').stock = 1
    const quote = await quoteCart(mock.api, { items: [DUO] })
    expect(quote.lines[0]).toMatchObject({
      issue: 'quantity_reduced',
      maxQuantity: 1,
      unitPriceArs: 68998,
      kitSavingsArs: 6999,
      totalArs: 61999,
    })
  })

  it('price_changed compara con el precio del combo, no con la suma de las piezas', async () => {
    const mock = createCheckoutApi()
    product(mock, 'prd-imperial-premium').priceArs = 41999
    const quote = await quoteCart(mock.api, {
      items: [
        { ...DUO, expectedUnitPriceArs: 61999 },
        { ...NO_MATE, expectedUnitPriceArs: 30000 },
      ],
    })
    expect(quote.lines.map((line) => line.issue)).toEqual([null, 'price_changed'])
    expect(quote.lines[0]).toMatchObject({ unitPriceArs: 70998, kitSavingsArs: 17998 })
  })

  it('responde 422 si un combo con un mate con cueros llega sin cuero', async () => {
    const mock = createCheckoutApi()
    await expect(
      quoteCart(mock.api, { items: [MATE, { ...DUO, options: null }] }),
    ).rejects.toMatchObject({
      status: 422,
      problem: {
        errors: [
          { field: 'items.1.options', code: 'required', message: 'Elegí el color del mate.' },
        ],
      },
    })
  })

  it('responde 422 si el cuero del combo no es uno de los del mate', async () => {
    const mock = createCheckoutApi()
    product(mock, 'prd-imperial-premium').leathers = ['Negro']
    await expect(quoteCart(mock.api, { items: [DUO] })).rejects.toMatchObject({
      status: 422,
      problem: {
        errors: [
          {
            field: 'items.0.options.leather',
            code: 'leather_not_offered',
            message: 'Ese color no está disponible para este mate.',
          },
        ],
      },
    })
  })

  it('un combo con un mate sin cueros ignora el cuero y no lo pide', async () => {
    const mock = createCheckoutApi()
    product(mock, 'prd-imperial-premium').leathers = []
    const quote = await quoteCart(mock.api, { items: [{ ...DUO, options: null }, DUO] })
    expect(quote.lines.map((line) => [line.key, line.detail, line.issue])).toEqual([
      ['combo:cmb-duo-imperial:-', 'Mate Imperial Premium + Bombillón Premium Curvo', null],
      ['combo:cmb-duo-imperial:Marrón', 'Mate Imperial Premium + Bombillón Premium Curvo', null],
    ])
  })
})
