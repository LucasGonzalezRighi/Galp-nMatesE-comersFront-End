// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { MOCK_MERCADOPAGO_RESOLVE_PATH } from '@galpon/api-client/mock'
import {
  CHALLENGE_DONE_MESSAGE,
  isChallengeDoneMessage,
  MOCK_RESOLVE_URL,
  notifyChallengeDone,
  resolveMockPayment,
} from './mp-simulator'
import { createResultTestApi, placeGuestOrder } from './test/support'

describe('MOCK_RESOLVE_URL', () => {
  it('es la ruta interna del simulador de la API de prueba, bajo /api/v1', () => {
    expect(MOCK_RESOLVE_URL).toBe(`/api/v1${MOCK_MERCADOPAGO_RESOLVE_PATH}`)
  })
})

describe('resolveMockPayment', () => {
  it('aplica el resultado al intento activo y devuelve la dirección de regreso', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await testApi.api.POST('/orders/{number}/payments/mercadopago/preference', {
      params: {
        path: { number: order.number },
        header: { 'Idempotency-Key': crypto.randomUUID() },
      },
    })

    await expect(
      resolveMockPayment(
        { number: order.number, intent: null, result: 'approved' },
        testApi.browserFetch,
      ),
    ).resolves.toBe(`/checkout/resultado?pedido=${order.number}`)
    expect(testApi.db.orders[0]?.status).toBe('paid')
  })

  it('si el intento ya no está activo lanza un Error con el estado', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)

    await expect(
      resolveMockPayment(
        { number: order.number, intent: null, result: 'approved' },
        testApi.browserFetch,
      ),
    ).rejects.toThrow(/404/)
  })

  it('valida el pedido', async () => {
    const fetchSpy = vi.fn<typeof fetch>()
    await expect(
      resolveMockPayment({ number: '123', intent: null, result: 'approved' }, fetchSpy),
    ).rejects.toThrow(RangeError)
    await expect(
      resolveMockPayment({ number: 'GLP-12345', intent: '', result: 'approved' }, fetchSpy),
    ).rejects.toThrow(RangeError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('no sigue una dirección de regreso a otro sitio', async () => {
    const fetchSpy = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({ returnUrl: '//evil.example/checkout' })),
    )
    await expect(
      resolveMockPayment({ number: 'GLP-12345', intent: null, result: 'approved' }, fetchSpy),
    ).rejects.toThrow(/regreso/)
  })
})

describe('mensaje de desafío terminado', () => {
  it('avisa a la ventana padre con el origen propio', () => {
    const postMessage = vi.fn()
    const frame = { parent: { postMessage }, location: { origin: 'http://localhost:3000' } }

    expect(notifyChallengeDone(frame)).toBe(true)
    expect(postMessage).toHaveBeenCalledWith(CHALLENGE_DONE_MESSAGE, 'http://localhost:3000')
  })

  it('fuera de un iframe no avisa a nadie', () => {
    const postMessage = vi.fn()
    const top: Parameters<typeof notifyChallengeDone>[0] = {
      parent: { postMessage },
      location: { origin: 'http://localhost:3000' },
    }
    const self = Object.assign(top, { parent: top })

    expect(notifyChallengeDone(self)).toBe(false)
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('solo acepta el mensaje del mismo origen y con el tipo justo', () => {
    const origin = 'http://localhost:3000'
    const message = (data: unknown, from: string) =>
      new MessageEvent('message', { data, origin: from })

    expect(isChallengeDoneMessage(message(CHALLENGE_DONE_MESSAGE, origin), origin)).toBe(true)
    expect(
      isChallengeDoneMessage(message(CHALLENGE_DONE_MESSAGE, 'https://evil.example'), origin),
    ).toBe(false)
    expect(isChallengeDoneMessage(message({ type: 'otro' }, origin), origin)).toBe(false)
    expect(isChallengeDoneMessage(message('galpon:challenge-done', origin), origin)).toBe(false)
  })
})
