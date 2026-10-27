// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearOrderSession,
  ORDER_SESSION_KEY,
  readOrderSession,
  readOrderToken,
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

  it('rechaza un número sin formato o un token vacío', () => {
    expect(() => {
      saveOrderSession({ ...SESSION, number: 'ABC' })
    }).toThrow(RangeError)
    expect(() => {
      saveOrderSession({ ...SESSION, orderToken: '' })
    }).toThrow(RangeError)
  })
})
