import { describe, expect, it } from 'vitest'
import { formatPercentAr, installmentAmount } from './installments'
import { pesos } from './money'

describe('installmentAmount', () => {
  it('divide el total en cuotas iguales, redondeando al peso', () => {
    expect(installmentAmount(pesos(39999), 3)).toBe(13333)
    expect(installmentAmount(pesos(68397), 3)).toBe(22799)
  })
  it('con una sola cuota es el total', () => {
    expect(installmentAmount(pesos(68397), 1)).toBe(68397)
  })
  it('redondea al peso más cercano cuando la división no es exacta', () => {
    expect(installmentAmount(pesos(100), 3)).toBe(33)
    expect(installmentAmount(pesos(200), 3)).toBe(67)
  })
  it('un total de $0 da cuotas de $0', () => {
    expect(installmentAmount(pesos(0), 6)).toBe(0)
  })
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza %s cuotas, que no es un entero mayor o igual a 1',
    (count) => {
      expect(() => installmentAmount(pesos(39999), count)).toThrow(RangeError)
    },
  )
  it('el mensaje de error está en español', () => {
    expect(() => installmentAmount(pesos(39999), 0)).toThrow(
      'La cantidad de cuotas tiene que ser un entero mayor o igual a 1; se recibió 0.',
    )
  })
})

describe('formatPercentAr', () => {
  it('muestra dos decimales con coma y un espacio antes del %', () => {
    expect(formatPercentAr(0)).toBe('0,00 %')
    expect(formatPercentAr(45.9)).toBe('45,90 %')
    expect(formatPercentAr(100)).toBe('100,00 %')
  })
  it('redondea a dos decimales', () => {
    expect(formatPercentAr(12.345678)).toBe('12,35 %')
  })
  it('usa un espacio común, no uno no separable', () => {
    expect(formatPercentAr(45.9)).toMatch(/^[\d,]+ %$/)
  })
  it('el cero negativo, y lo que redondea a cero, se muestran sin signo', () => {
    expect(formatPercentAr(-0)).toBe('0,00 %')
    expect(formatPercentAr(-0.001)).toBe('0,00 %')
  })
  it('rechaza valores que no son números finitos', () => {
    expect(() => formatPercentAr(Number.NaN)).toThrow(RangeError)
    expect(() => formatPercentAr(Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(() => formatPercentAr(Number.NEGATIVE_INFINITY)).toThrow(
      'El porcentaje tiene que ser un número finito; se recibió -Infinity.',
    )
  })
})
