import { describe, expect, it } from 'vitest'
import { smoothingShare } from './smoothing'

describe('smoothingShare', () => {
  it('a 60 cuadros por segundo se acerca el 5,5 % por cuadro, como el diseño', () => {
    expect(smoothingShare(1 / 60)).toBeCloseTo(0.055, 9)
  })

  it('depende del tiempo y no de los cuadros: dos cuadros a 120 Hz valen uno a 60 Hz', () => {
    const half = smoothingShare(1 / 120)
    expect(1 - (1 - half) ** 2).toBeCloseTo(smoothingShare(1 / 60), 9)
    expect(smoothingShare(0)).toBe(0)
    expect(smoothingShare(10)).toBeLessThanOrEqual(1)
    expect(smoothingShare(10)).toBeGreaterThan(0.99)
  })

  it('lanza RangeError si el tiempo del cuadro no es un número finito mayor o igual a 0', () => {
    for (const dt of [Number.NaN, -0.01, Number.POSITIVE_INFINITY]) {
      expect(() => smoothingShare(dt)).toThrow(RangeError)
    }
  })
})
