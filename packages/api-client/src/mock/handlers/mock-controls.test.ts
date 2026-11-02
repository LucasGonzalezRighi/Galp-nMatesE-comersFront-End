import { describe, expect, it, vi } from 'vitest'
import type { CartItemInput } from '../../generated/schema'
import { createMercadoPagoPreference, getOrder, quoteCart } from '../../services'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from '../db'
import { createMockFetch } from '../mock-fetch'
import { createCheckoutApi, orderInput, placeOrder, postOrder } from '../test/checkout-api'
import { randomUuid } from '../uuid'
import { MOCK_EXPIRE_ORDER_PATH, MOCK_PRODUCT_PATH } from './mock-controls'

/** Mate Imperial Premium ($39.999) con cuero y virola, como lo manda la tienda. */
const MATE = {
  type: 'product',
  productId: 'prd-imperial-premium',
  quantity: 1,
  options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
} satisfies CartItemInput

/** Dos Mates Coquito Criollo: alcanzan para agotar el stock con dos pedidos. */
const COQUITO = {
  items: [
    {
      type: 'product' as const,
      productId: 'prd-coquito-criollo',
      quantity: 2,
      options: { leather: 'Negro' as const, ferrule: 'Acero' as const },
    },
  ],
  expectedTotalArs: 2 * 28999 + 6500,
}

/** Manda un pedido crudo a una ruta de control, con la ruta ya armada. */
function control(mock: ReturnType<typeof createCheckoutApi>, path: string, body?: unknown) {
  return mock.raw(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

/** Ruta de {@link MOCK_EXPIRE_ORDER_PATH} para un pedido. */
function expirePath(number: string): string {
  return MOCK_EXPIRE_ORDER_PATH.replace('{number}', number)
}

/** Ruta de {@link MOCK_PRODUCT_PATH} para un producto. */
function productPath(id: string): string {
  return MOCK_PRODUCT_PATH.replace('{id}', id)
}

describe('POST /__mock/orders/{number}/expire', () => {
  it('vence el pedido ahora, libera el stock y cancela el intento de pago activo', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock, COQUITO)
    await createMercadoPagoPreference(mock.api, order.number, randomUuid())
    expect((await postOrder(mock, orderInput(COQUITO))).status).toBe(409)

    const response = await control(mock, expirePath(order.number))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      number: order.number,
      status: 'expired',
      reservedUntil: '2026-10-26T15:00:00.000Z',
    })

    await expect(getOrder(mock.api, order.number)).resolves.toMatchObject({
      status: 'expired',
      paymentStatus: 'cancelled',
    })
    expect(mock.db.orders[0]?.reservation).toEqual([])
    expect((await postOrder(mock, orderInput(COQUITO))).status).toBe(201)
  })

  it('el pedido vencido no admite pagos (409 "El pedido venció.")', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await control(mock, expirePath(order.number))
    await expect(
      createMercadoPagoPreference(mock.api, order.number, randomUuid()),
    ).rejects.toMatchObject({
      status: 409,
      problem: { type: 'order_not_payable', detail: 'El pedido venció.' },
    })
  })

  it('un pedido que no espera el pago responde 409, uno inexistente 404 y un número mal formado 422', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await control(mock, expirePath(order.number))
    const again = await control(mock, expirePath(order.number))
    expect(again.status).toBe(409)
    await expect(again.json()).resolves.toMatchObject({ type: 'order_not_pending' })
    expect((await control(mock, expirePath('GLP-99999'))).status).toBe(404)
    expect((await control(mock, expirePath('GLP-12'))).status).toBe(422)
  })
})

describe('POST /__mock/products/{id}', () => {
  it('cambia el precio: la tienda que mandó el anterior recibe 409 price_changed', async () => {
    const mock = createCheckoutApi()
    const response = await control(mock, productPath('prd-imperial-premium'), { priceArs: 41999 })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      id: 'prd-imperial-premium',
      priceArs: 41999,
    })

    const quote = await quoteCart(mock.api, {
      items: [{ ...MATE, expectedUnitPriceArs: 39999 }],
    })
    expect(quote.lines[0]).toMatchObject({ unitPriceArs: 41999, issue: 'price_changed' })

    const conflict = await postOrder(
      mock,
      orderInput({ items: [{ ...MATE, expectedUnitPriceArs: 39999 }] }),
    )
    expect(conflict.status).toBe(409)
    await expect(conflict.json()).resolves.toMatchObject({ type: 'price_changed' })
    expect(mock.db.orders).toHaveLength(0)
  })

  it('sin el precio esperado, el cambio llega como 409 total_changed', async () => {
    const mock = createCheckoutApi()
    await control(mock, productPath('prd-imperial-premium'), { priceArs: 41999 })
    const conflict = await postOrder(mock, orderInput())
    expect(conflict.status).toBe(409)
    await expect(conflict.json()).resolves.toMatchObject({ type: 'total_changed' })
  })

  it('cambia el stock: con 0 la línea queda agotada', async () => {
    const mock = createCheckoutApi()
    const response = await control(mock, productPath('prd-imperial-premium'), { stock: 0 })
    await expect(response.json()).resolves.toMatchObject({ stock: 0 })
    const quote = await quoteCart(mock.api, { items: [MATE] })
    expect(quote.lines[0]).toMatchObject({ issue: 'sold_out', maxQuantity: 0 })
  })

  it('avisa que cambió el catálogo para renovar la caché de la tienda', async () => {
    const onInvalidate = vi.fn()
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0, onInvalidate })
    const response = await mockFetch(
      new Request(`http://localhost/api/v1${productPath('prd-imperial-premium')}`, {
        method: 'POST',
        body: JSON.stringify({ priceArs: 41999 }),
      }),
    )
    expect(response.status).toBe(200)
    expect(onInvalidate).toHaveBeenCalledWith(['products'])
  })

  it('valida el cuerpo: algún campo, enteros no negativos y nada más', async () => {
    const mock = createCheckoutApi()
    const path = productPath('prd-imperial-premium')
    for (const body of [{}, { priceArs: -1 }, { stock: 1.5 }, { priceArs: 1, nombre: 'x' }]) {
      expect((await control(mock, path, body)).status).toBe(422)
    }
    expect(mock.db.products.find((product) => product.id === 'prd-imperial-premium')).toMatchObject(
      { priceArs: 39999 },
    )
  })

  it('un producto que no existe responde 404', async () => {
    const mock = createCheckoutApi()
    expect((await control(mock, productPath('prd-no-existe'), { stock: 1 })).status).toBe(404)
  })
})
