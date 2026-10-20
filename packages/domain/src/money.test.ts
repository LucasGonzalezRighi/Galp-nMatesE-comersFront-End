import { describe, expect, it } from 'vitest'
import { formatDiscountPercent, formatDiscountPesos, formatPesos, pesos, sumPesos } from './money'

describe('money', () => {
  it('formatea pesos como el diseño, sin espacio', () => {
    expect(formatPesos(pesos(39999))).toBe('$39.999')
    expect(formatPesos(pesos(0))).toBe('$0')
    expect(formatPesos(pesos(1234567))).toBe('$1.234.567')
    // \s incluye el espacio no separable (U+00A0) que Intl pone en es-AR con style 'currency'.
    expect(formatPesos(pesos(39999))).not.toMatch(/\s/)
  })
  it('usa el signo menos U+2212 en descuentos', () => {
    expect(formatDiscountPesos(pesos(3600))).toBe('−$3.600')
    expect(formatDiscountPercent(10)).toBe('−10%')
  })
  it('rechaza montos que no son enteros seguros no negativos', () => {
    expect(() => pesos(-1)).toThrow(RangeError)
    expect(() => pesos(1.5)).toThrow(RangeError)
    expect(() => pesos(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError)
  })
  it('rechaza NaN e infinito', () => {
    expect(() => pesos(Number.NaN)).toThrow(RangeError)
    expect(() => pesos(Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(() => pesos(Number.NEGATIVE_INFINITY)).toThrow(RangeError)
  })
  it('normaliza el cero negativo: pesos(-0) es 0 y se muestra "$0"', () => {
    expect(Object.is(pesos(-0), 0)).toBe(true)
    expect(formatPesos(pesos(-0))).toBe('$0')
  })
  it('suma montos', () => {
    expect(sumPesos([])).toBe(0)
    expect(sumPesos([pesos(1), pesos(2)])).toBe(3)
  })
  it('rechaza una suma que supera el máximo entero seguro', () => {
    expect(sumPesos([pesos(Number.MAX_SAFE_INTEGER), pesos(0)])).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => sumPesos([pesos(Number.MAX_SAFE_INTEGER), pesos(1)])).toThrow(RangeError)
  })
})

describe('formatDiscountPercent', () => {
  it('acepta los enteros de 0 a 100', () => {
    expect(formatDiscountPercent(0)).toBe('−0%')
    expect(formatDiscountPercent(100)).toBe('−100%')
  })
  it.each([-1, 101, 10.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza %s, que no es un entero entre 0 y 100',
    (percent) => {
      expect(() => formatDiscountPercent(percent)).toThrow(RangeError)
    },
  )
  it('el mensaje de error está en español y dice qué se recibió', () => {
    expect(() => formatDiscountPercent(101)).toThrow(/entero entre 0 y 100.*101/)
  })
})
