// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearOrderSession,
  ORDER_SESSION_KEY,
  readOrderSession,
  readOrderToken,
  saveChallengeUrl,
  saveOrderSession,
} from './order-session'

const SESSION = { number: 'GLP-10001', orderToken: 'tok-abc', cartHash: '00ab12cd34ef56' }

describe('order-session', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('guarda y lee el pedido en curso', () => {
    saveOrderSession(SESSION)
    expect(readOrderSession()).toEqual(SESSION)
    expect(readOrderToken()).toBe('tok-abc')
  })

  it('sin pedido guardado devuelve null y el token undefined', () => {
    expect(readOrderSession()).toBeNull()
    expect(readOrderToken()).toBeUndefined()
  })

  it('descarta lo guardado si no tiene la forma esperada', () => {
    sessionStorage.setItem(ORDER_SESSION_KEY, '{"number":"GLP-1","orderToken":"x"}')
    expect(readOrderSession()).toBeNull()
    sessionStorage.setItem(ORDER_SESSION_KEY, 'no es json')
    expect(readOrderSession()).toBeNull()
  })

  it('olvida el pedido en curso', () => {
    saveOrderSession(SESSION)
    clearOrderSession()
    expect(readOrderSession()).toBeNull()
  })

  it('recuerda la dirección del desafío 3-D Secure del pedido y la olvida con null', () => {
    saveOrderSession(SESSION)
    saveChallengeUrl('GLP-10001', 'https://www.mercadopago.com.ar/3ds/challenge?id=abc123')
    expect(readOrderSession()).toEqual({
      ...SESSION,
      challengeUrl: 'https://www.mercadopago.com.ar/3ds/challenge?id=abc123',
    })

    saveChallengeUrl('GLP-10001', '/checkout/mp-simulado?pedido=GLP-10001&challenge=1')
    expect(readOrderSession()?.challengeUrl).toBe(
      '/checkout/mp-simulado?pedido=GLP-10001&challenge=1',
    )

    saveChallengeUrl('GLP-10001', null)
    expect(readOrderSession()).toEqual(SESSION)
  })

  it('no guarda el desafío de otro pedido ni si no hay pedido en curso', () => {
    saveChallengeUrl('GLP-10001', 'https://www.mercadopago.com.ar/3ds/challenge?id=abc123')
    expect(readOrderSession()).toBeNull()

    saveOrderSession(SESSION)
    saveChallengeUrl('GLP-99999', 'https://www.mercadopago.com.ar/3ds/challenge?id=abc123')
    expect(readOrderSession()).toEqual(SESSION)
  })

  it('rechaza una dirección de desafío que no sea https ni una ruta de la tienda', () => {
    saveOrderSession(SESSION)
    for (const url of ['javascript:alert(1)', 'http://mp.example/3ds', '//evil.example/3ds', '']) {
      expect(() => {
        saveChallengeUrl('GLP-10001', url)
      }).toThrow(RangeError)
    }
    expect(() => {
      saveChallengeUrl('ABC', null)
    }).toThrow(RangeError)
  })

  it('descarta el desafío guardado si no sirve, pero conserva el pedido', () => {
    sessionStorage.setItem(
      ORDER_SESSION_KEY,
      JSON.stringify({ ...SESSION, challengeUrl: 'javascript:alert(1)' }),
    )
    expect(readOrderSession()).toEqual(SESSION)
    sessionStorage.setItem(ORDER_SESSION_KEY, JSON.stringify({ ...SESSION, challengeUrl: 42 }))
    expect(readOrderSession()).toEqual(SESSION)
  })

  it('rechaza un número sin formato o un token vacío', () => {
    expect(() => {
      saveOrderSession({ ...SESSION, number: 'ABC' })
    }).toThrow(RangeError)
    expect(() => {
      saveOrderSession({ ...SESSION, orderToken: '' })
    }).toThrow(RangeError)
  })
})
