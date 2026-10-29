import { describe, expect, it } from 'vitest'
import type { YerbaShape } from './yerba-shape'
import { GRAIN_AMPLITUDE, hollowCenter, YERBA_RADIUS, yerbaHeight, yerbaShade } from './yerba-shape'

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

describe('yerbaShade', () => {
  /** La montañita armada: llena, asentada y con la pared recta. */
  const MOUND = { fill: 1, slope: 1, wall: 1 } as const

  it('sin montañita (slope 0) no oscurece nada', () => {
    for (const [x, z] of samplePoints()) {
      expect(yerbaShade(x, z, { fill: 1, slope: 0, wall: 0 })).toEqual({ hollow: 0, occlusion: 0 })
    }
  })

  it('siempre da valores de 0 a 1', () => {
    for (const shape of [MOUND, { fill: 0.4, slope: 0.6, wall: 0.3 }]) {
      for (const [x, z] of samplePoints()) {
        const { hollow, occlusion } = yerbaShade(x, z, shape)
        for (const value of [hollow, occlusion]) {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('la meseta queda sin oscurecer y el piso del hueco entero oscurecido', () => {
    expect(yerbaShade(-0.2, 0, MOUND)).toEqual({ hollow: 0, occlusion: 0 })
    expect(yerbaShade(0.3, 0, MOUND).hollow).toBeGreaterThan(0.99)
  })

  it('la banda oscura está al pie de la pared y se apaga lejos de ella', () => {
    const foot = yerbaShade(0.09, 0, MOUND).occlusion
    const far = yerbaShade(0.3, 0, MOUND).occlusion
    expect(foot).toBeGreaterThan(0.6)
    expect(far).toBeLessThan(0.05)
    expect(yerbaShade(0.14, 0, MOUND).occlusion).toBeLessThan(foot)
  })

  it('con la pendiente natural (wall 0) el pie se oscurece menos que con la pared recta', () => {
    const natural = yerbaShade(0.09, 0, { fill: 1, slope: 1, wall: 0 }).occlusion
    expect(natural).toBeLessThan(yerbaShade(0.09, 0, MOUND).occlusion)
  })

  it('lanza RangeError con la forma fuera de 0 a 1 o el punto fuera de la boca', () => {
    expect(() => yerbaShade(0, 0, { fill: 1, slope: -0.1, wall: 0 })).toThrow(RangeError)
    expect(() => yerbaShade(0.5, 0, MOUND)).toThrow(RangeError)
    expect(() => yerbaShade(Number.NaN, 0, MOUND)).toThrow(RangeError)
  })
})
