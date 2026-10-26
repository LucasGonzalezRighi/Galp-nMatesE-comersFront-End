import { describe, expect, it } from 'vitest'
import { leatherIndexForProgress } from './leather-scroll'

describe('leatherIndexForProgress', () => {
  it('reparte el avance en tramos iguales, uno por cuero', () => {
    expect(leatherIndexForProgress(0, 4)).toBe(0)
    expect(leatherIndexForProgress(0.24, 4)).toBe(0)
    expect(leatherIndexForProgress(0.25, 4)).toBe(1)
    expect(leatherIndexForProgress(0.5, 4)).toBe(2)
    expect(leatherIndexForProgress(0.99, 4)).toBe(3)
  })

  it('recorta el avance fuera de 0 a 1 y no se pasa del último cuero', () => {
    expect(leatherIndexForProgress(-3, 4)).toBe(0)
    expect(leatherIndexForProgress(1, 4)).toBe(3)
    expect(leatherIndexForProgress(7, 4)).toBe(3)
  })

  it('rechaza un avance que no es un número y una cantidad que no es un entero mayor o igual a 1', () => {
    expect(() => leatherIndexForProgress(Number.NaN, 4)).toThrow(RangeError)
    expect(() => leatherIndexForProgress(0.5, 0)).toThrow(RangeError)
    expect(() => leatherIndexForProgress(0.5, 2.5)).toThrow(RangeError)
  })
})
