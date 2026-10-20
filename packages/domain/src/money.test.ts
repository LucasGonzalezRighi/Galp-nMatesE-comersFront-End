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
  it('suma montos', () => {
    expect(sumPesos([])).toBe(0)
    expect(sumPesos([pesos(1), pesos(2)])).toBe(3)
  })
})
