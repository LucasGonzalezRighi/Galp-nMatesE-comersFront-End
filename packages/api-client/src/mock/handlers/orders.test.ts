import { describe, expect, it } from 'vitest'
import type { CartItemInput, CreateOrderResult } from '../../generated/schema'
import { getOrder } from '../../services'
import { MOCK_DB_LIMITS } from '../limits'
import { createCheckoutApi, orderInput, placeOrder, postOrder, START } from '../test/checkout-api'
import { randomUuid } from '../uuid'

/** Mate Imperial Premium con su cuero, como lo manda la tienda. */
const MATE = {
  type: 'product',
  productId: 'prd-imperial-premium',
  quantity: 1,
  options: { leather: 'Negro' },
} satisfies CartItemInput

describe('POST /orders', () => {
  it('crea el pedido pendiente de pago y reserva 30 minutos; el acceso se valida contra tokenHash y el token en claro queda en creation para repetir la respuesta', async () => {
    const mock = createCheckoutApi()
    const response = await postOrder(mock, orderInput())
    expect(response.status).toBe(201)
    const { order, orderToken } = (await response.json()) as CreateOrderResult
    expect(order.number).toMatch(/^GLP-\d{5}$/)
    expect(order).toMatchObject({
      status: 'pending_payment',
      paymentStatus: 'none',
      customer: { email: 'lucia@ejemplo.com', phone: '1123456789' },
      shipping: { method: 'home', costArs: 6500, eta: '3 a 6 días hábiles' },
      itemsGrossArs: 39999,
      kitSavingsArs: 0,
      subtotalArs: 39999,
      shippingArs: 6500,
      totalArs: 46499,
      payment: { method: 'mp_redirect', installments: null, statusDetail: null },
      tracking: null,
      history: [{ status: 'pending_payment', at: START.toISOString(), note: null }],
      createdAt: START.toISOString(),
      reservedUntil: '2026-10-26T15:30:00.000Z',
    })
    expect(order.lines[0]).toEqual({
      type: 'product',
      name: 'Mate Imperial Premium',
      detail: 'Color negro',
      quantity: 1,
      unitPriceArs: 39999,
      kitSavingsArs: 0,
      totalArs: 39999,
      productSlug: 'mate-imperial-premium',
      options: { leather: 'Negro' },
      kitItems: null,
    })
    expect(orderToken.length).toBeGreaterThan(20)
    expect(mock.db.orders[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(mock.db.orders[0]?.creation.orderToken).toBe(orderToken)
  })

  it('arma la línea de un kit con sus tres piezas y el cuero del mate', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock, {
      shipping: { method: 'pickup', address: null },
      items: [
        {
          type: 'kit',
          mateId: 'prd-imperial-premium',
          bombillaId: 'prd-bombillon-premium-curvo',
          yerbaId: 'prd-yerba-canarias',
          leather: 'Negro',
          quantity: 1,
        },
      ],
      expectedTotalArs: 71097,
    })
    expect(order.lines[0]).toMatchObject({
      type: 'kit',
      name: 'Kit',
      unitPriceArs: 78997,
      kitSavingsArs: 7900,
      totalArs: 71097,
      productSlug: null,
      options: { leather: 'Negro' },
      kitItems: [
        { slug: 'mate-imperial-premium', name: 'Mate Imperial Premium', unitPriceArs: 39999 },
        { slug: 'bombillon-premium-curvo', name: 'Bombillón Premium Curvo', unitPriceArs: 28999 },
        { slug: 'yerba-canarias-1-kg', name: 'Yerba Canarias 1 kg', unitPriceArs: 9999 },
      ],
    })
    expect(order.shipping).toEqual({
      method: 'pickup',
      address: null,
      costArs: 0,
      eta: 'Coordinamos por mail',
    })
  })

  it('sin Idempotency-Key responde 422', async () => {
    const mock = createCheckoutApi()
    const response = await postOrder(mock, orderInput(), null)
    expect(response.status).toBe(422)
    expect(mock.db.orders).toHaveLength(0)
  })

  it('con la misma clave y el mismo cuerpo devuelve el mismo pedido (doble clic)', async () => {
    const mock = createCheckoutApi()
    const key = randomUuid()
    const [first, second] = await Promise.all([
      postOrder(mock, orderInput(), key),
      postOrder(mock, orderInput(), key),
    ])
    const a = (await first.json()) as CreateOrderResult
    const b = (await second.json()) as CreateOrderResult
    expect([first.status, second.status]).toEqual([201, 201])
    expect(b.order.number).toBe(a.order.number)
    expect(b.orderToken).toBe(a.orderToken)
    expect(mock.db.orders).toHaveLength(1)
  })

  it('con la misma clave y otro cuerpo responde 422 y no crea otro pedido', async () => {
    const mock = createCheckoutApi()
    const key = randomUuid()
    await postOrder(mock, orderInput(), key)
    const response = await postOrder(
      mock,
      orderInput({ customer: { ...orderInput().customer, firstName: 'Paula' } }),
      key,
    )
    expect(response.status).toBe(422)
    expect(mock.db.orders).toHaveLength(1)
  })

  it('si cambió el precio responde 409 total_changed con el detalle y no crea nada', async () => {
    const mock = createCheckoutApi()
    const mate = mock.db.products.find((product) => product.id === 'prd-imperial-premium')
    if (mate === undefined) throw new Error('Falta el fixture')
    mate.priceArs = 42999
    const response = await postOrder(mock, orderInput())
    expect(response.status).toBe(409)
    const problem = (await response.json()) as { type: string; changes: unknown[] }
    expect(problem.type).toBe('total_changed')
    expect(problem.changes).toEqual([
      { kind: 'price', productId: null, message: 'El total cambió de $46.499 a $49.499.' },
    ])
    expect(mock.db.orders).toHaveLength(0)
  })

  it('si no alcanza el stock responde 409 stock_changed', async () => {
    const mock = createCheckoutApi()
    const response = await postOrder(
      mock,
      orderInput({
        items: [{ ...MATE, productId: 'prd-coquito-criollo', quantity: 3 }],
        expectedTotalArs: 3 * 28999 + 6500,
      }),
    )
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      type: 'stock_changed',
      changes: [
        {
          kind: 'stock',
          productId: 'prd-coquito-criollo',
          message: 'Quedan 2 unidades de Mate Coquito Criollo.',
        },
      ],
    })
  })

  it('si la tienda mandó el precio por línea y cambió, responde 409 price_changed', async () => {
    const mock = createCheckoutApi()
    const response = await postOrder(
      mock,
      orderInput({ items: [{ ...MATE, expectedUnitPriceArs: 35999 }] }),
    )
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      type: 'price_changed',
      changes: [{ kind: 'price', productId: 'prd-imperial-premium' }],
    })
  })

  it('el stock reservado por un pedido pendiente no se le vende a otro', async () => {
    const mock = createCheckoutApi()
    const coquito = {
      items: [
        {
          type: 'product' as const,
          productId: 'prd-coquito-criollo',
          quantity: 2,
          options: { leather: 'Negro' as const },
        },
      ],
      expectedTotalArs: 2 * 28999 + 6500,
    }
    await placeOrder(mock, coquito)
    const response = await postOrder(mock, orderInput(coquito))
    expect(response.status).toBe(409)
  })

  it('valida los datos con los mensajes por campo', async () => {
    const mock = createCheckoutApi()
    const response = await postOrder(
      mock,
      orderInput({
        customer: { email: 'no-es-mail', firstName: 'L', lastName: 'Pérez', phone: null },
        shipping: { method: 'home', address: null },
      }),
    )
    expect(response.status).toBe(422)
    const problem = (await response.json()) as { errors: { field: string }[] }
    expect(problem.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(['customer.email', 'customer.firstName', 'shipping.address.street']),
    )
  })

  it('con el campo trampa lleno responde como si nada y no guarda el pedido', async () => {
    const mock = createCheckoutApi()
    const response = await postOrder(mock, orderInput({ website: 'https://spam.example' }))
    expect(response.status).toBe(201)
    expect(mock.db.orders).toHaveLength(0)
  })

  it('para la idempotencia guarda solo el SHA-256 del cuerpo, aunque traiga claves de más', async () => {
    const mock = createCheckoutApi()
    const key = randomUuid()
    const body = { ...orderInput(), relleno: 'x'.repeat(10_000) }
    const first = await postOrder(mock, body, key)
    expect(first.status).toBe(201)
    const fingerprint = mock.db.orders[0]?.creation.fingerprint
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(mock.db.orders)).not.toContain('xxxxxxxxxx')

    const replay = await postOrder(mock, body, key)
    expect(replay.status).toBe(201)
    expect(((await replay.json()) as CreateOrderResult).order.number).toBe(
      ((await first.json()) as CreateOrderResult).order.number,
    )
    expect((await postOrder(mock, orderInput(), key)).status).toBe(422)
    expect(mock.db.orders).toHaveLength(1)
  })
})

describe('números de pedido', () => {
  it('después de GLP-99999 vuelve a GLP-10001 en vez de fallar con 500', async () => {
    const mock = createCheckoutApi()
    await placeOrder(mock)
    const [only] = mock.db.orders
    if (only === undefined) throw new Error('Falta el pedido')
    only.number = 'GLP-99999'
    const { order } = await placeOrder(mock)
    expect(order.number).toBe('GLP-10001')
    await expect(placeOrder(mock)).resolves.toMatchObject({ order: { number: 'GLP-10002' } })
  })

  it('al dar la vuelta saltea los números que siguen en la base', async () => {
    const mock = createCheckoutApi()
    await placeOrder(mock)
    await placeOrder(mock)
    const [, newest] = mock.db.orders
    if (newest === undefined) throw new Error('Falta el pedido')
    newest.number = 'GLP-99999'
    const { order } = await placeOrder(mock)
    expect(order.number).toBe('GLP-10002')
  })

  it('guarda hasta MOCK_DB_LIMITS.orders pedidos: uno nuevo descarta el más viejo', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    const [template] = mock.db.orders
    if (template === undefined) throw new Error('Falta el pedido')
    mock.db.orders = Array.from({ length: MOCK_DB_LIMITS.orders }, (_, index) => ({
      ...structuredClone(template),
      number: `GLP-${String(20_000 + index)}`,
      status: 'expired' as const,
      reservation: [],
    }))
    const created = await placeOrder(mock)
    expect(mock.db.orders).toHaveLength(MOCK_DB_LIMITS.orders)
    expect(mock.db.orders[0]?.number).toBe('GLP-20001')
    expect(mock.db.orders.at(-1)?.number).toBe(created.order.number)
    expect(created.order.number).not.toBe(order.number)
  })
})

describe('GET /orders/{number}', () => {
  it('devuelve el pedido con su token y 404 sin token o con otro', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await expect(getOrder(mock.api, order.number)).resolves.toMatchObject({
      number: order.number,
    })
    mock.setOrderToken('otro-token')
    await expect(getOrder(mock.api, order.number)).rejects.toMatchObject({ status: 404 })
    mock.setOrderToken(undefined)
    await expect(getOrder(mock.api, order.number)).rejects.toMatchObject({ status: 404 })
    const response = await mock.raw('/orders/GLP-123')
    expect(response.status).toBe(422)
  })

  it('a los 30 minutos sin pago vence y libera el stock reservado', async () => {
    const mock = createCheckoutApi()
    const coquito = {
      items: [
        {
          type: 'product' as const,
          productId: 'prd-coquito-criollo',
          quantity: 2,
          options: { leather: 'Negro' as const },
        },
      ],
      expectedTotalArs: 2 * 28999 + 6500,
    }
    const { order } = await placeOrder(mock, coquito)
    mock.advance(29)
    await expect(getOrder(mock.api, order.number)).resolves.toMatchObject({
      status: 'pending_payment',
    })
    mock.advance(1)
    const expired = await getOrder(mock.api, order.number)
    expect(expired.status).toBe('expired')
    expect(expired.history.at(-1)).toEqual({
      status: 'expired',
      at: order.reservedUntil,
      note: null,
    })
    expect(mock.db.orders[0]?.reservation).toEqual([])
    const again = await postOrder(mock, orderInput(coquito))
    expect(again.status).toBe(201)
  })
})

describe('POST /orders con combos', () => {
  const DUO = {
    type: 'combo',
    comboId: 'cmb-duo-imperial',
    quantity: 2,
    options: { leather: 'Marrón' },
    expectedUnitPriceArs: 61999,
  } satisfies CartItemInput

  it('guarda la línea del combo con sus piezas en kitItems, el ahorro y la reserva de cada pieza', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock, {
      shipping: { method: 'pickup', address: null },
      items: [DUO],
      expectedTotalArs: 123998,
    })
    expect(order.lines).toEqual([
      {
        type: 'combo',
        name: 'Dúo Imperial',
        detail: 'Mate Imperial Premium + Bombillón Premium Curvo · Color marrón',
        quantity: 2,
        unitPriceArs: 68998,
        kitSavingsArs: 13998,
        totalArs: 123998,
        productSlug: null,
        options: { leather: 'Marrón' },
        kitItems: [
          { slug: 'mate-imperial-premium', name: 'Mate Imperial Premium', unitPriceArs: 39999 },
          { slug: 'bombillon-premium-curvo', name: 'Bombillón Premium Curvo', unitPriceArs: 28999 },
        ],
      },
    ])
    expect(order).toMatchObject({
      itemsGrossArs: 137996,
      kitSavingsArs: 13998,
      subtotalArs: 123998,
      totalArs: 123998,
    })
    expect(mock.db.orders.at(-1)?.reservation).toEqual([
      { productId: 'prd-imperial-premium', quantity: 2 },
      { productId: 'prd-bombillon-premium-curvo', quantity: 2 },
    ])
  })

  it('un combo sin mate guarda options en null', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock, {
      shipping: { method: 'pickup', address: null },
      items: [{ type: 'combo', comboId: 'cmb-bombilla-y-yerba', quantity: 1, options: null }],
      expectedTotalArs: 34999,
    })
    expect(order.lines[0]).toMatchObject({ type: 'combo', options: null, productSlug: null })
    expect(order.lines[0]?.kitItems).toHaveLength(2)
  })

  it('si cambió el precio del combo responde 409 price_changed con su nombre y su precio', async () => {
    const mock = createCheckoutApi()
    const response = await postOrder(
      mock,
      orderInput({ items: [{ ...DUO, expectedUnitPriceArs: 59999 }], expectedTotalArs: 130498 }),
    )
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      type: 'price_changed',
      changes: [
        {
          kind: 'price',
          productId: null,
          message: 'Dúo Imperial cambió de precio: ahora cuesta $61.999.',
        },
      ],
    })
  })

  it('si el combo ya no está publicado responde 409 stock_changed con su nombre', async () => {
    const mock = createCheckoutApi()
    const combo = mock.db.combos.find((candidate) => candidate.id === 'cmb-duo-imperial')
    if (combo === undefined) throw new Error('Falta el fixture')
    combo.status = 'draft'
    const response = await postOrder(mock, orderInput({ items: [DUO], expectedTotalArs: 130498 }))
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      type: 'stock_changed',
      changes: [
        { kind: 'unavailable', productId: null, message: 'Dúo Imperial ya no está disponible.' },
      ],
    })
  })
})
