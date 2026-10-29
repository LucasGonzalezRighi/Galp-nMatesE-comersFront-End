import { describe, expect, it } from 'vitest'
import type { StreamPoint } from './water-path'
import { streamPoints } from './water-path'

/** El pico del termo arriba a la derecha y el hueco abajo a la izquierda, como en la parada 3. */
const SPOUT: StreamPoint = { x: 1.9, y: 1.3, z: 0.1 }
const HOLLOW: StreamPoint = { x: 1.4, y: -0.15, z: 0.25 }

/** Distancia horizontal (en `x`, `z`) entre dos puntos. */
function horizontal(from: StreamPoint, to: StreamPoint): number {
  return Math.hypot(to.x - from.x, to.z - from.z)
}

describe('streamPoints', () => {
  it('devuelve la cantidad pedida de puntos', () => {
    for (const count of [2, 3, 17, 48]) {
      expect(streamPoints(SPOUT, HOLLOW, count)).toHaveLength(count)
    }
  })

  it('empieza en la boca del pico y termina en el hueco', () => {
    const points = streamPoints(SPOUT, HOLLOW, 24)
    expect(points[0]).toEqual(SPOUT)
    expect(points.at(-1)).toEqual(HOLLOW)
    expect(streamPoints(SPOUT, HOLLOW, 2)).toEqual([SPOUT, HOLLOW])
  })

  it('baja siempre: la altura decrece de un punto al siguiente', () => {
    const points = streamPoints(SPOUT, HOLLOW, 64)
    for (let index = 1; index < points.length; index++) {
      expect(points[index]?.y ?? Number.NaN).toBeLessThan(points[index - 1]?.y ?? Number.NaN)
    }
  })

  it('se curva hacia el hueco: se acerca siempre y el último tramo cae casi vertical', () => {
    const points = streamPoints(SPOUT, HOLLOW, 31)
    for (let index = 1; index < points.length; index++) {
      const previous = points[index - 1] ?? SPOUT
      const current = points[index] ?? HOLLOW
      expect(horizontal(current, HOLLOW)).toBeLessThanOrEqual(horizontal(previous, HOLLOW) + 1e-9)
    }
    // El primer tercio cubre más camino horizontal que el último: el chorro sale del pico con
    // impulso y termina cayendo derecho sobre el hueco.
    const first = horizontal(points[0] ?? SPOUT, points[10] ?? HOLLOW)
    const last = horizontal(points[20] ?? SPOUT, points[30] ?? HOLLOW)
    expect(first).toBeGreaterThan(last * 2)
  })

  it('lanza RangeError con menos de dos puntos o una cantidad que no es entera', () => {
    for (const count of [1, 0, -3, 2.5, Number.NaN]) {
      expect(() => streamPoints(SPOUT, HOLLOW, count)).toThrow(RangeError)
    }
  })

  it('lanza RangeError con puntos que no son finitos o si el hueco no está más abajo que el pico', () => {
    expect(() => streamPoints({ ...SPOUT, x: Number.NaN }, HOLLOW, 8)).toThrow(RangeError)
    expect(() => streamPoints(SPOUT, { ...HOLLOW, z: Number.POSITIVE_INFINITY }, 8)).toThrow(
      RangeError,
    )
    expect(() => streamPoints(SPOUT, { ...HOLLOW, y: SPOUT.y }, 8)).toThrow(RangeError)
    expect(() => streamPoints(HOLLOW, SPOUT, 8)).toThrow(RangeError)
  })
})
