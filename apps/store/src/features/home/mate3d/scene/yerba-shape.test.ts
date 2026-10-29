import { describe, expect, it } from 'vitest'
import type { YerbaShape } from './yerba-shape'
import { GRAIN_AMPLITUDE, hollowCenter, YERBA_RADIUS, yerbaHeight } from './yerba-shape'

/** Nivel de la superficie plana para un llenado: de 0,6 (vacío) a 0,985 (lleno). */
function level(fill: number): number {
  return 0.6 + (0.985 - 0.6) * fill
}

/** Puntos repartidos adentro de la boca (anillos y radios), en coordenadas del mate. */
function samplePoints(): readonly (readonly [number, number])[] {
  const points: [number, number][] = [[0, 0]]
  for (let ring = 1; ring <= 8; ring++) {
    const radius = (YERBA_RADIUS * ring) / 8
    for (let spoke = 0; spoke < 24; spoke++) {
      const angle = (spoke / 24) * Math.PI * 2
      points.push([radius * Math.cos(angle), radius * Math.sin(angle)])
    }
  }
  return points
}

/** La caída de la superficie entre `x = 0` y `x = 0,1` sobre el eje (`z = 0`). */
function drop(shape: YerbaShape): number {
  return yerbaHeight(0, 0, shape) - yerbaHeight(0.1, 0, shape)
}

describe('yerbaHeight', () => {
  it('con slope 0 y wall 0 es plana al nivel de fill: solo cambia el grano', () => {
    for (const fill of [0, 0.45, 1]) {
      for (const [x, z] of samplePoints()) {
        const height = yerbaHeight(x, z, { fill, slope: 0, wall: 0 })
        expect(Math.abs(height - level(fill))).toBeLessThanOrEqual(GRAIN_AMPLITUDE + 1e-12)
      }
    }
  })

  it('con slope 1 es más alta a la izquierda (x < 0) que a la derecha', () => {
    for (const wall of [0, 1]) {
      const shape = { fill: 1, slope: 1, wall }
      expect(yerbaHeight(-0.3, 0, shape) - yerbaHeight(0.3, 0, shape)).toBeGreaterThan(0.2)
    }
  })

  it('la meseta izquierda queda al nivel de fill y el hueco derecho 0,22 más abajo', () => {
    const shape = { fill: 1, slope: 1, wall: 1 }
    expect(Math.abs(yerbaHeight(-0.25, 0, shape) - level(1))).toBeLessThanOrEqual(GRAIN_AMPLITUDE)
    expect(Math.abs(yerbaHeight(0.25, 0, shape) - (level(1) - 0.22))).toBeLessThanOrEqual(
      GRAIN_AMPLITUDE,
    )
  })

  it('con wall 1 la caída entre x = 0 y x = 0,1 es más brusca que con wall 0 (la pared)', () => {
    const steep = drop({ fill: 1, slope: 1, wall: 1 })
    const natural = drop({ fill: 1, slope: 1, wall: 0 })
    expect(steep).toBeGreaterThan(natural + 0.05)
    expect(steep).toBeGreaterThan(0.2)
  })

  it('el hueco no baja del fondo curado aunque haya poca yerba', () => {
    for (const [x, z] of samplePoints()) {
      expect(yerbaHeight(x, z, { fill: 0.2, slope: 1, wall: 1 })).toBeGreaterThan(0.56)
    }
  })

  it('es determinista: los mismos datos dan la misma altura, y el grano varía de un punto a otro', () => {
    const shape = { fill: 0.7, slope: 0.4, wall: 0.6 }
    const first = samplePoints().map(([x, z]) => yerbaHeight(x, z, shape))
    const second = samplePoints().map(([x, z]) => yerbaHeight(x, z, shape))
    expect(second).toEqual(first)
    const flat = samplePoints().map(([x, z]) => yerbaHeight(x, z, { fill: 0.5, slope: 0, wall: 0 }))
    expect(new Set(flat).size).toBeGreaterThan(flat.length / 2)
  })

  it('lanza RangeError si fill, slope o wall no están entre 0 y 1', () => {
    const shapes: YerbaShape[] = [
      { fill: -0.1, slope: 0, wall: 0 },
      { fill: 0, slope: 1.1, wall: 0 },
      { fill: 0, slope: 0, wall: Number.NaN },
      { fill: Number.POSITIVE_INFINITY, slope: 0, wall: 0 },
    ]
    for (const shape of shapes) expect(() => yerbaHeight(0, 0, shape)).toThrow(RangeError)
  })

  it('lanza RangeError si el punto cae fuera de la boca o no es finito', () => {
    const shape = { fill: 0.5, slope: 0, wall: 0 }
    expect(() => yerbaHeight(YERBA_RADIUS + 0.01, 0, shape)).toThrow(RangeError)
    expect(() => yerbaHeight(0.3, -0.3, shape)).toThrow(RangeError)
    expect(() => yerbaHeight(Number.NaN, 0, shape)).toThrow(RangeError)
    expect(() => yerbaHeight(YERBA_RADIUS, 0, shape)).not.toThrow()
  })
})

describe('hollowCenter', () => {
  it('es el centro del hueco derecho (x 0,18, z 0,04) a la altura de la superficie ahí', () => {
    const shape = { fill: 1, slope: 1, wall: 1 }
    const center = hollowCenter(shape)
    expect(center.x).toBeCloseTo(0.18, 9)
    expect(center.z).toBeCloseTo(0.04, 9)
    expect(center.y).toBe(yerbaHeight(0.18, 0.04, shape))
    expect(center.y).toBeLessThan(yerbaHeight(-0.2, 0.04, shape) - 0.2)
  })

  it('lanza RangeError con un dato fuera de 0 a 1', () => {
    expect(() => hollowCenter({ fill: 2, slope: 0, wall: 0 })).toThrow(RangeError)
  })
})
