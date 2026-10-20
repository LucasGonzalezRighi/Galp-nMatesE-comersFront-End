import { describe, expect, it } from 'vitest'
import { pesos } from './money'
import { netPrice } from './tax'

describe('netPrice', () => {
  it('quita el IVA del precio final', () => {
    expect(netPrice(pesos(12100), 21)).toBe(10000)
    expect(netPrice(pesos(39999), 21)).toBe(33057)
  })
  it('acepta alícuotas con decimales, como el 10,5%', () => {
    expect(netPrice(pesos(11050), 10.5)).toBe(10000)
  })
  it('con alícuota 0 el precio sin impuestos es el mismo', () => {
    expect(netPrice(pesos(39999), 0)).toBe(39999)
  })
  it('un precio de $0 queda en $0', () => {
    expect(netPrice(pesos(0), 21)).toBe(0)
  })
  it('acepta el extremo de 100', () => {
    expect(netPrice(pesos(1000), 100)).toBe(500)
  })
  it.each([-1, -0.01, 100.01, 101, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza una alícuota de %s, fuera de 0 a 100',
    (rate) => {
      expect(() => netPrice(pesos(12100), rate)).toThrow(RangeError)
    },
  )
  it('el mensaje de error está en español', () => {
    expect(() => netPrice(pesos(12100), 101)).toThrow(
      'La alícuota tiene que ser un número entre 0 y 100; se recibió 101.',
    )
  })
})
