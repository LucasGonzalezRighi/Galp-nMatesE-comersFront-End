import { describe, expect, it } from 'vitest'
import type { CardPaymentInput } from '../../generated/schema'
import {
  cancelPayment,
  createMercadoPagoPreference,
  getInstallments,
  getOrder,
  payWithCard,
} from '../../services'
import { createMockCardToken } from '../card-token'
import { MOCK_MERCADOPAGO_RESOLVE_PATH } from '../handlers/mercadopago-simulator'
import { createCheckoutApi, placeOrder } from '../test/checkout-api'
import { randomUuid } from '../uuid'

/** Datos de tarjeta con el titular que decide el resultado simulado. */
function card(cardholderName: string, installments = 1): CardPaymentInput {
  return {
    token: createMockCardToken({ cardholderName, lastFour: '4242' }),
    paymentMethodId: 'visa',
    issuerId: null,
    installments,
    payer: { email: 'lucia@ejemplo.com', identification: { type: 'DNI', number: '12345678' } },
  }
}

/** Manda un pedido crudo al simulador de Mercado Pago. */
function resolve(mock: ReturnType<typeof createCheckoutApi>, body: unknown) {
  return mock.raw(MOCK_MERCADOPAGO_RESOLVE_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /orders/{number}/payments/mercadopago/preference', () => {
  it('devuelve la dirección del simulador y la repite con la misma clave', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    const key = randomUuid()
    const first = await createMercadoPagoPreference(mock.api, order.number, key)
    const intent = mock.db.orders[0]?.intents[0]?.id ?? ''
    expect(first.initPoint).toBe(
      `/checkout/mp-simulado?pedido=${order.number}&intent=${encodeURIComponent(intent)}`,
    )
    await expect(createMercadoPagoPreference(mock.api, order.number, key)).resolves.toEqual(first)
    expect(mock.db.orders[0]?.intents).toHaveLength(1)
  })

  it('una preferencia nueva cancela el intento activo anterior: hay uno solo', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await createMercadoPagoPreference(mock.api, order.number, randomUuid())
    await createMercadoPagoPreference(mock.api, order.number, randomUuid())
    expect(mock.db.orders[0]?.intents.map((intent) => intent.status)).toEqual(['cancelled', 'none'])
  })

  it('sin token responde 404', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    mock.setOrderToken(undefined)
    await expect(
      createMercadoPagoPreference(mock.api, order.number, randomUuid()),
    ).rejects.toMatchObject({ status: 404 })
  })
})

describe('POST /orders/{number}/payments/mercadopago/card', () => {
  it.each([
    ['APRO', 'approved', 'accredited'],
    ['CONT', 'pending', 'pending_contingency'],
    ['OTHE', 'rejected', 'cc_rejected_other_reason'],
    ['FUND', 'rejected', 'cc_rejected_insufficient_amount'],
    ['SECU', 'rejected', 'cc_rejected_bad_filled_security_code'],
    ['EXPI', 'rejected', 'cc_rejected_bad_filled_date'],
    ['CALL', 'rejected', 'cc_rejected_call_for_authorize'],
  ])('el titular %s da %s (%s)', async (holder, paymentStatus, statusDetail) => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await expect(payWithCard(mock.api, order.number, card(holder), randomUuid())).resolves.toEqual({
      paymentStatus,
      statusDetail,
      challenge: null,
    })
    await expect(getOrder(mock.api, order.number)).resolves.toMatchObject({
      status: paymentStatus === 'approved' ? 'paid' : 'pending_payment',
      paymentStatus,
      payment: { method: 'card', installments: 1, lastFour: '4242', statusDetail },
    })
  })

  it('el titular 3DS pide la verificación del banco', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await expect(payWithCard(mock.api, order.number, card('3DS'), randomUuid())).resolves.toEqual({
      paymentStatus: 'action_required',
      statusDetail: 'pending_challenge',
      challenge: { url: `/checkout/mp-simulado?pedido=${order.number}&challenge=1` },
    })
  })

  it('aprobado: el pedido pasa a pagado, descuenta el stock y vacía la reserva', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await payWithCard(mock.api, order.number, card('APRO'), randomUuid())
    const mate = mock.db.products.find((product) => product.id === 'prd-imperial-premium')
    expect(mate?.stock).toBe(11)
    expect(mock.db.orders[0]?.reservation).toEqual([])
    const paid = await getOrder(mock.api, order.number)
    expect(paid.history.map((entry) => entry.status)).toEqual(['pending_payment', 'paid'])
    mock.advance(60)
    await expect(getOrder(mock.api, order.number)).resolves.toMatchObject({ status: 'paid' })
  })

  it('con la misma clave devuelve el primer resultado y no cobra de nuevo', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    const key = randomUuid()
    const input = card('CONT')
    const [a, b] = await Promise.all([
      payWithCard(mock.api, order.number, input, key),
      payWithCard(mock.api, order.number, input, key),
    ])
    expect(b).toEqual(a)
    expect(mock.db.orders[0]?.intents).toHaveLength(1)
    await expect(payWithCard(mock.api, order.number, card('APRO'), key)).rejects.toMatchObject({
      status: 422,
    })
  })

  it('un pago con tarjeta cancela la preferencia activa', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await createMercadoPagoPreference(mock.api, order.number, randomUuid())
    await payWithCard(mock.api, order.number, card('CONT'), randomUuid())
    expect(mock.db.orders[0]?.intents.map((intent) => intent.status)).toEqual([
      'cancelled',
      'pending',
    ])
  })

  it('valida el token y las cuotas', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await expect(
      payWithCard(mock.api, order.number, { ...card('APRO'), token: 'tok-falso' }, randomUuid()),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { token: expect.any(String) as unknown } })
    await expect(
      payWithCard(mock.api, order.number, card('APRO', 5), randomUuid()),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { installments: expect.any(String) as unknown },
    })
  })

  it('un pedido pagado o vencido no admite otro pago (409)', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await payWithCard(mock.api, order.number, card('APRO'), randomUuid())
    await expect(
      payWithCard(mock.api, order.number, card('APRO'), randomUuid()),
    ).rejects.toMatchObject({ status: 409, problem: { type: 'order_not_payable' } })

    const other = await placeOrder(mock)
    mock.advance(31)
    await expect(
      createMercadoPagoPreference(mock.api, other.order.number, randomUuid()),
    ).rejects.toMatchObject({ status: 409, problem: { detail: 'El pedido venció.' } })
    await expect(
      getInstallments(mock.api, other.order.number, {
        bin: '450995',
        paymentTypeId: 'credit_card',
      }),
    ).rejects.toMatchObject({ status: 409 })
    await expect(cancelPayment(mock.api, other.order.number)).rejects.toMatchObject({
      status: 409,
    })
  })
})

describe('POST /orders/{number}/payments/mercadopago/installments', () => {
  it('con crédito ofrece las cuotas sin interés de los ajustes y 6 y 12 con CFT', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    const options = await getInstallments(mock.api, order.number, {
      bin: '450995',
      paymentTypeId: 'credit_card',
    })
    expect(
      options.map((option) => [option.installments, option.cftPercent, option.teaPercent]),
    ).toEqual([
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0],
      [6, 45.9, 38],
      [12, 45.9, 38],
    ])
    expect(options[0]).toEqual({
      installments: 1,
      installmentAmountArs: 46499,
      totalArs: 46499,
      cftPercent: 0,
      teaPercent: 0,
      label: '1 pago de $46.499',
    })
    expect(options[2]).toMatchObject({
      installmentAmountArs: 15500,
      totalArs: 46499,
      label: '3 cuotas sin interés de $15.500',
    })
    const six = options[3]
    expect(six?.totalArs).toBeGreaterThan(46499)
    expect(six?.label).toBe(
      `6 cuotas de $${(six?.installmentAmountArs ?? 0).toLocaleString('es-AR')} (CFT 45,90 %)`,
    )
  })

  it('con débito ofrece un solo pago', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    const options = await getInstallments(mock.api, order.number, {
      bin: '450995',
      paymentTypeId: 'debit_card',
    })
    expect(options.map((option) => option.installments)).toEqual([1])
  })
})

describe('POST /orders/{number}/cancel-payment', () => {
  it('cancela el intento activo, el pedido sigue pendiente y conserva la reserva', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await payWithCard(mock.api, order.number, card('CONT'), randomUuid())
    await expect(cancelPayment(mock.api, order.number)).resolves.toBeUndefined()
    await expect(cancelPayment(mock.api, order.number)).resolves.toBeUndefined()
    const after = await getOrder(mock.api, order.number)
    expect(after).toMatchObject({
      status: 'pending_payment',
      paymentStatus: 'cancelled',
      reservedUntil: order.reservedUntil,
    })
    expect(mock.db.orders[0]?.reservation).not.toEqual([])
  })
})

describe('simulador de Mercado Pago', () => {
  it.each([
    ['approved', 'paid', 'approved'],
    ['pending', 'pending_payment', 'pending'],
    ['rejected', 'pending_payment', 'rejected'],
  ])(
    'resolver %s deja el pedido %s y devuelve la URL de regreso',
    async (result, status, payment) => {
      const mock = createCheckoutApi()
      const { order } = await placeOrder(mock)
      await createMercadoPagoPreference(mock.api, order.number, randomUuid())
      const intent = mock.db.orders[0]?.intents[0]?.id
      const response = await resolve(mock, { number: order.number, intent, result })
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        returnUrl: `/checkout/resultado?pedido=${order.number}`,
      })
      await expect(getOrder(mock.api, order.number)).resolves.toMatchObject({
        status,
        paymentStatus: payment,
      })
    },
  )

  it('confirma el desafío 3-D Secure del intento activo sin el id del intento', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await payWithCard(mock.api, order.number, card('3DS'), randomUuid())
    const response = await resolve(mock, { number: order.number, intent: null, result: 'approved' })
    expect(response.status).toBe(200)
    await expect(getOrder(mock.api, order.number)).resolves.toMatchObject({
      status: 'paid',
      paymentStatus: 'approved',
    })
  })

  it('no resuelve un intento cancelado ni datos inválidos', async () => {
    const mock = createCheckoutApi()
    const { order } = await placeOrder(mock)
    await createMercadoPagoPreference(mock.api, order.number, randomUuid())
    const intent = mock.db.orders[0]?.intents[0]?.id
    await createMercadoPagoPreference(mock.api, order.number, randomUuid())
    expect((await resolve(mock, { number: order.number, intent, result: 'approved' })).status).toBe(
      409,
    )
    expect((await resolve(mock, { number: order.number, intent, result: 'otro' })).status).toBe(422)
  })
})
