import { describe, expect, it } from 'vitest'
import { tokens } from '@galpon/design-tokens'
import { EASE_MAIN, EASE_SPRING, parseCubicBezier } from './easing'
import { assertFinite, assertIntegerInRange, assertNonNegative } from './validate'

describe('parseCubicBezier', () => {
  it('convierte la curva CSS en la tupla de Motion', () => {
    expect(parseCubicBezier('cubic-bezier(.16,1,.3,1)')).toEqual([0.16, 1, 0.3, 1])
    expect(parseCubicBezier(' cubic-bezier( 0.34 , 1.56 , 0.64 , 1 ) ')).toEqual([
      0.34, 1.56, 0.64, 1,
    ])
  })

  it('las curvas de la animación salen de los tokens de diseño', () => {
    expect(EASE_MAIN).toEqual(parseCubicBezier(tokens.easing.main))
    expect(EASE_SPRING).toEqual(parseCubicBezier(tokens.easing.spring))
    expect(EASE_SPRING[1]).toBeGreaterThan(1)
  })

  it('rechaza lo que no es una curva con un mensaje en español', () => {
    expect(() => parseCubicBezier('ease-in')).toThrow(RangeError)
    expect(() => parseCubicBezier('ease-in')).toThrow(/no tiene la forma cubic-bezier/)
    expect(() => parseCubicBezier('cubic-bezier(1,2,3)')).toThrow(RangeError)
  })

  it('rechaza una curva con x fuera de 0 a 1', () => {
    expect(() => parseCubicBezier('cubic-bezier(1.5,0,.3,1)')).toThrow(/entre 0 y 1/)
  })
})

describe('validaciones de configuración', () => {
  it('assertNonNegative acepta 0 y rechaza negativos, NaN e infinito', () => {
    expect(() => {
      assertNonNegative('delay', 0)
    }).not.toThrow()
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => {
        assertNonNegative('delay', bad)
      }).toThrow(/delay tiene que ser un número mayor o igual a 0/)
    }
  })

  it('assertFinite acepta negativos y rechaza NaN', () => {
    expect(() => {
      assertFinite('strength', -30)
    }).not.toThrow()
    expect(() => {
      assertFinite('strength', Number.NaN)
    }).toThrow(RangeError)
  })

  it('assertIntegerInRange exige un entero dentro del rango', () => {
    expect(() => {
      assertIntegerInRange('decimals', 2, 0, 6)
    }).not.toThrow()
    expect(() => {
      assertIntegerInRange('decimals', 2.5, 0, 6)
    }).toThrow(/entero de 0 a 6/)
    expect(() => {
      assertIntegerInRange('decimals', 7, 0, 6)
    }).toThrow(RangeError)
  })
})
