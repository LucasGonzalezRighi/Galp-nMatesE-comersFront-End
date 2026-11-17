import { describe, expect, it, vi } from 'vitest'
import type { CartItemInput, PublicSettings } from '../../generated/schema'
import { createMercadoPagoPreference, getOrder, getPublicSettings, quoteCart } from '../../services'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from '../db'
import { createMockFetch } from '../mock-fetch'
import { createCheckoutApi, orderInput, placeOrder, postOrder } from '../test/checkout-api'
import { randomUuid } from '../uuid'
import { MOCK_EXPIRE_ORDER_PATH, MOCK_PRODUCT_PATH, MOCK_SETTINGS_PATH } from './mock-controls'

/** Mate Imperial Premium ($39.999) con su cuero, como lo manda la tienda. */
const MATE = {
  type: 'product',
  productId: 'prd-imperial-premium',
  quantity: 1,
  options: { leather: 'Negro' },
} satisfies CartItemInput

/** Dos Mates Coquito Criollo: alcanzan para agotar el stock con dos pedidos. */
const COQUITO = {
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

  it('cambia los cueros: los guarda en orden y sin repetir, y la cotización los usa', async () => {
    const mock = createCheckoutApi()
    const response = await control(mock, productPath('prd-imperial-criollo'), {
      leathers: ['Crudo', 'Marrón', 'Crudo'],
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      id: 'prd-imperial-criollo',
      priceArs: 29999,
      stock: 12,
      leathers: ['Marrón', 'Crudo'],
    })
    await expect(
      quoteCart(mock.api, { items: [{ ...MATE, productId: 'prd-imperial-criollo' }] }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { 'items.0.options.leather': 'Ese cuero no está disponible para este mate.' },
    })
    expect(
      (await control(mock, productPath('prd-imperial-criollo'), { leathers: ['Rosa'] })).status,
    ).toBe(422)
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

describe('POST /__mock/settings', () => {
  const SELLER = {
    legalName: 'Galpón Mates S. R. L.',
    cuit: '20-12345678-6',
    taxCondition: 'Responsable inscripto',
    address: 'Av. Siempre Viva 742, CABA',
    phone: null,
    supportArea: 'Atención al cliente',
    supportHours: 'Lunes a viernes de 9 a 18',
    dataFiscalUrl: 'https://qr.afip.gob.ar/?qr=abc123',
  }

  it('cambia el vendedor, lo normaliza y lo devuelve con los ajustes públicos', async () => {
    const mock = createCheckoutApi()
    const response = await control(mock, MOCK_SETTINGS_PATH, { seller: SELLER })
    expect(response.status).toBe(200)
    const settings = (await response.json()) as PublicSettings
    expect(settings.seller).toEqual({ ...SELLER, cuit: '20123456786' })
    expect(settings).not.toHaveProperty('vatRatePercent')
    expect(mock.db.settings.seller.cuit).toBe('20123456786')
    await expect(getPublicSettings(mock.api)).resolves.toMatchObject({
      seller: { legalName: 'Galpón Mates S. R. L.' },
    })
  })

  it('cambia los enlaces de Defensa del Consumidor y deja el vendedor', async () => {
    const mock = createCheckoutApi()
    const consumerLinks = {
      cabaUrl: 'https://caba.example/',
      nationalUrl: 'https://nacion.example/',
    }
    expect((await control(mock, MOCK_SETTINGS_PATH, { consumerLinks })).status).toBe(200)
    expect(mock.db.settings.consumerLinks).toEqual(consumerLinks)
    expect(mock.db.settings.seller.legalName).toBeNull()
  })

  it('avisa que cambiaron los ajustes', async () => {
    const onInvalidate = vi.fn()
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0, onInvalidate })
    const response = await mockFetch(
      new Request(`http://localhost/api/v1${MOCK_SETTINGS_PATH}`, {
        method: 'POST',
        body: JSON.stringify({ seller: SELLER }),
      }),
    )
    expect(response.status).toBe(200)
    expect(onInvalidate).toHaveBeenCalledWith(['settings'])
  })

  it('valida el cuerpo: alguno de los dos, con las reglas de los ajustes, y nada más', async () => {
    const mock = createCheckoutApi()
    for (const body of [
      {},
      { seller: { ...SELLER, cuit: '20123456780' } },
      { consumerLinks: { cabaUrl: '', nationalUrl: 'https://nacion.example/' } },
      { seller: SELLER, extra: 1 },
    ]) {
      expect((await control(mock, MOCK_SETTINGS_PATH, body)).status).toBe(422)
    }
    expect(mock.db.settings.seller.legalName).toBeNull()
  })
})

describe('allowControl: quién puede usar los controles', () => {
  it('si dice que no, los tres controles responden 404 y no cambian nada', async () => {
    const mock = createCheckoutApi({ allowControl: () => false })
    const { order } = await placeOrder(mock)

    const expire = await control(mock, expirePath(order.number))
    expect(expire.status).toBe(404)
    const change = await control(mock, productPath('prd-imperial-premium'), { stock: 0 })
    expect(change.status).toBe(404)
    expect(await change.json()).toMatchObject({ type: 'not_found', status: 404 })
    const consumerLinks = {
      cabaUrl: 'https://caba.example/',
      nationalUrl: 'https://nacion.example/',
    }
    const settings = await control(mock, MOCK_SETTINGS_PATH, { consumerLinks })
    expect(settings.status).toBe(404)

    expect(mock.db.orders[0]?.status).toBe('pending_payment')
    const mate = mock.db.products.find((product) => product.id === 'prd-imperial-premium')
    expect(mate?.stock).toBe(12)
    expect(mock.db.settings.consumerLinks).not.toEqual(consumerLinks)
    await expect(quoteCart(mock.api, { items: [MATE] })).resolves.toBeDefined()
  })

  it('recibe el pedido: con la cabecera que espera, el control anda', async () => {
    const allowControl = vi.fn(
      (request: Request) => request.headers.get('X-Mock-Control-Secret') === 'secreto',
    )
    const mock = createCheckoutApi({ allowControl })
    const denied = await control(mock, productPath('prd-imperial-premium'), { stock: 3 })
    expect(denied.status).toBe(404)
    const allowed = await mock.raw(productPath('prd-imperial-premium'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Mock-Control-Secret': 'secreto' },
      body: JSON.stringify({ stock: 3 }),
    })
    expect(allowed.status).toBe(200)
    expect(allowControl).toHaveBeenCalledTimes(2)
  })

  it('no se consulta para las demás rutas', async () => {
    const allowControl = vi.fn(() => false)
    const mock = createCheckoutApi({ allowControl })
    await placeOrder(mock)
    expect(allowControl).not.toHaveBeenCalled()
  })
})
