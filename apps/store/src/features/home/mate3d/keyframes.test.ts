import { describe, expect, it } from 'vitest'
import type { MateMoment, MatePlacement, MateState } from './keyframes'
import { HOLD_SHARE } from '../stage-layout'
import { lerpMateState, MATE_KEYFRAMES, mateStateAt } from './keyframes'

/** Tramo del avance que ocupa cada una de las tres paradas. */
const SPAN = 1 / 3

/** Largo del hold de cada parada. */
const HOLD = SPAN * HOLD_SHARE

/** Avance en que termina el hold de una parada (desde 0). */
function holdEnd(stop: number): number {
  return SPAN * (stop + HOLD_SHARE)
}

/** El momento de la lista con ese nombre. */
function keyframe(name: MateMoment): (typeof MATE_KEYFRAMES)[number] {
  const found = MATE_KEYFRAMES.find((candidate) => candidate.name === name)
  if (found === undefined) throw new Error(`Falta el momento ${name}`)
  return found
}

/** El estado de un momento de la lista. */
function moment(name: MateMoment): MateState {
  return keyframe(name).state
}

/** Si una colocación queda fuera de cuadro (más allá de un borde de la pantalla). */
function offscreen(placement: MatePlacement): boolean {
  return Math.abs(placement[0]) > 1 || Math.abs(placement[1]) > 1
}

/**
 * Espera que el mate esté de frente, como en la portada (`inicio`): mismo lugar y mismo giro Y,
 * apenas mirado desde arriba (giro X de 10 a 18, no los 45 de antes) y casi del mismo tamaño.
 */
function expectFront(placement: MatePlacement): void {
  const cover = moment('inicio').mate
  expect(placement[0]).toBeCloseTo(cover[0], 6)
  expect(placement[1]).toBeCloseTo(cover[1], 6)
  expect(placement[2]).toBeGreaterThanOrEqual(cover[2])
  expect(placement[2]).toBeLessThanOrEqual(1.05)
  expect(placement[3]).toBeGreaterThanOrEqual(cover[3])
  expect(placement[3]).toBeLessThanOrEqual(18)
  expect(placement[4]).toBe(cover[4])
  expect(placement[5]).toBe(0)
}

/** Los valores del estado que van de 0 a 1. */
function unitValues(state: MateState): number[] {
  return [
    state.attached,
    state.fill,
    state.slope,
    state.wall,
    state.wet,
    state.water,
    state.steam,
    state.puddle,
    state.splash,
    state.pour,
  ]
}

/** Los números de un estado, en orden, para compararlos de a uno. */
function flatten(state: MateState): number[] {
  return [
    ...state.mate,
    ...state.bombilla,
    ...state.pack,
    ...state.thermos,
    ...unitValues(state),
    state.tilt,
  ]
}

/** Espera que dos estados sean iguales con tres decimales. */
function expectClose(actual: MateState, expected: MateState): void {
  const values = flatten(expected)
  flatten(actual).forEach((value, index) => {
    expect(value).toBeCloseTo(values[index] ?? Number.NaN, 3)
  })
}

describe('MATE_KEYFRAMES: un momento por paso del armado', () => {
  it('inicio (0): el mate de pie y vacío a la derecha; paquete, bombilla y termo fuera de cuadro', () => {
    const state = mateStateAt(0)
    expect(state).toEqual(moment('inicio'))
    expect(state).toMatchObject({ fill: 0, slope: 0, wall: 0, pour: 0, attached: 0 })
    expect(state).toMatchObject({ water: 0, splash: 0, puddle: 0, wet: 0, steam: 0 })
    expect(state.mate[0]).toBeGreaterThan(0.3)
    expect(state.mate[5]).toBe(0)
    // El paquete espera arriba, a la izquierda del mate.
    expect(state.pack[1]).toBeGreaterThan(1)
    expect(state.pack[0]).toBeLessThan(state.mate[0])
    expect(offscreen(state.bombilla)).toBe(true)
    expect(offscreen(state.thermos)).toBe(true)
  })

  it('inclinado (hold·0,35): el mate inclinado 55° a la izquierda y el paquete volcando sobre la boca', () => {
    const { from, to, state } = keyframe('inclinado')
    expect(from).toBeCloseTo(HOLD * 0.35, 9)
    expect(to).toBe(from)
    expect(mateStateAt(from)).toEqual(state)
    expect(state.mate[5]).toBe(55)
    expect(state).toMatchObject({ pour: 1, fill: 0.45, slope: 1, wall: 0, attached: 0 })
    // El paquete está en cuadro, cabeza abajo (el pico hacia el mate), a la izquierda del mate.
    expect(offscreen(state.pack)).toBe(false)
    expect(Math.abs(state.pack[5])).toBeGreaterThan(120)
    expect(state.pack[0]).toBeLessThan(state.mate[0])
    expect(state.pack[1]).toBeGreaterThan(state.mate[1])
  })

  it('lleno (hold·0,85): ya no cae yerba, el mate lleno y todavía inclinado, el paquete saliendo', () => {
    const { from, to, state } = keyframe('lleno')
    const tilted = moment('inclinado')
    expect(from).toBeCloseTo(HOLD * 0.85, 9)
    expect(to).toBe(from)
    expect(state.mate[5]).toBe(40)
    expect(state).toMatchObject({ pour: 0, fill: 1, slope: 1, wall: 0.35, attached: 0 })
    // El paquete sube y se va por arriba a la izquierda.
    expect(state.pack[1]).toBeGreaterThan(tilted.pack[1])
    expect(state.pack[0]).toBeLessThan(tilted.pack[0])
  })

  it('bombilla (todo el hold 2): el mate de frente como en la portada, la pared recta y la bombilla calzada', () => {
    const { from, to, state } = keyframe('bombilla')
    expect(from).toBeCloseTo(SPAN, 9)
    expect(to).toBeCloseTo(holdEnd(1), 9)
    expect(state.mate[5]).toBe(0)
    expect(state).toMatchObject({ fill: 1, slope: 1, wall: 1, attached: 1, pour: 0, water: 0 })
    expect(state.tilt).not.toBe(0)
    // De frente, como la portada: la montañita asoma sobre la virola y el hueco queda bajo el borde.
    expectFront(state.mate)
    expect(offscreen(state.pack)).toBe(true)
    expect(offscreen(state.thermos)).toBe(true)
    expect(mateStateAt(SPAN)).toEqual(state)
    expect(mateStateAt(SPAN + HOLD / 2)).toEqual(state)
    expect(mateStateAt(holdEnd(1))).toEqual(state)
  })

  it('agua (2/3 + hold·0,25): el pico del termo arriba a la derecha y el chorro cayendo en el hueco', () => {
    const { from, to, state } = keyframe('agua')
    expect(from).toBeCloseTo(2 * SPAN + HOLD * 0.25, 9)
    expect(to).toBe(from)
    expect(state).toMatchObject({ water: 1, splash: 1, wet: 0.7, puddle: 0.5, steam: 0.6 })
    expect(state).toMatchObject({ attached: 1, fill: 1, slope: 1, wall: 1, pour: 0 })
    expect(offscreen(state.thermos)).toBe(false)
    expect(state.thermos[0]).toBeGreaterThan(state.mate[0])
    expect(state.thermos[1]).toBeGreaterThan(0)
    // La boca del pico mira abajo a la izquierda, hacia el hueco; el mate sigue de frente, quieto.
    expect(state.thermos[5]).toBeGreaterThan(120)
    expectFront(state.mate)
    expect(state.mate).toEqual(moment('bombilla').mate)
  })

  it('el termo tiene el mismo tamaño en todos los momentos: no crece ni se achica al entrar', () => {
    const scales = new Set(MATE_KEYFRAMES.map(({ state }) => state.thermos[2]))
    expect(scales.size).toBe(1)
  })

  it('la parada 3 llega con el termo entrando y el chorro empezando', () => {
    const arrival = mateStateAt(2 * SPAN)
    const pouring = moment('agua')
    expect(arrival.thermos[1]).toBeGreaterThan(pouring.thermos[1])
    expect(arrival.thermos[1]).toBeLessThan(moment('bombilla').thermos[1])
    expect(arrival.water).toBeGreaterThan(0)
    expect(arrival.water).toBeLessThan(1)
  })

  it('agua-fin (fin del hold 3): el chorro cortó, queda el charco, la yerba húmeda y el vapor', () => {
    const { from, to, state } = keyframe('agua-fin')
    expect(from).toBeCloseTo(holdEnd(2), 9)
    expect(to).toBe(from)
    expect(state).toMatchObject({ water: 0, splash: 0, wet: 1, puddle: 1, steam: 1, attached: 1 })
    // El termo sube para irse; el mate no se movió desde la parada 2.
    expect(state.thermos[1]).toBeGreaterThan(moment('agua').thermos[1])
    expect(state.mate).toEqual(moment('bombilla').mate)
  })

  it('salida (1): el mate sube al medio y crece hacia la cámara, como si te lo dieran', () => {
    const exit = mateStateAt(1)
    const end = moment('agua-fin')
    expect(exit).toEqual(moment('salida'))
    expect(Math.abs(exit.mate[0])).toBeLessThanOrEqual(0.05)
    // Sube de verdad (Lucas: "para arriba y al medio"): el centro pasa por encima de la mitad.
    expect(exit.mate[1]).toBeGreaterThanOrEqual(0.08)
    expect(exit.mate[1] - end.mate[1]).toBeGreaterThanOrEqual(0.18)
    // Crece hacia la cámara, pero menos que antes (1,45), para que la bombilla no pase bajo el
    // encabezado.
    expect(exit.mate[2]).toBeGreaterThanOrEqual(1.25)
    expect(exit.mate[2]).toBeLessThanOrEqual(1.35)
    // La boca se vuelca hacia quien mira (giro X positivo, más que en la parada 3): se ve la
    // montañita y la bombilla queda más acostada, con la punta debajo del encabezado.
    expect(exit.mate[3]).toBeGreaterThan(end.mate[3])
    expect(exit.mate[3]).toBeLessThanOrEqual(32)
    // Apenas volcado hacia la bombilla, como cuando te lo pasan.
    expect(exit.mate[5]).toBeLessThan(0)
    expect(Math.abs(exit.mate[5])).toBeLessThanOrEqual(15)
    expect(offscreen(exit.thermos)).toBe(true)
    expect(exit).toMatchObject({ steam: 0.5, water: 0, splash: 0, attached: 1 })
  })

  it('van en orden, sin solaparse, de 0 a 1', () => {
    expect(MATE_KEYFRAMES.map(({ name }) => name)).toEqual([
      'inicio',
      'inclinado',
      'lleno',
      'bombilla',
      'agua',
      'agua-fin',
      'salida',
    ])
    expect(MATE_KEYFRAMES[0].from).toBe(0)
    expect(MATE_KEYFRAMES.at(-1)?.to).toBe(1)
    let previous = -1
    for (const { from, to } of MATE_KEYFRAMES) {
      expect(from).toBeGreaterThan(previous)
      expect(to).toBeGreaterThanOrEqual(from)
      previous = to
    }
  })

  it('los valores entre 0 y 1 del estado nunca se salen de ese rango', () => {
    for (const { state } of MATE_KEYFRAMES) {
      for (const value of unitValues(state)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('mateStateAt', () => {
  it('en el hold de la parada 1 la yerba cae y el mate se va llenando mientras se inclina', () => {
    const shares = [0.1, 0.25, 0.5, 0.75]
    const fills = shares.map((share) => mateStateAt(holdEnd(0) * share).fill)
    expect(fills).toEqual([...fills].sort((a, b) => a - b))
    expect(fills[0]).toBeGreaterThan(0)
    expect(fills.at(-1)).toBeLessThan(1)
    expect(mateStateAt(HOLD * 0.2).mate[5]).toBeGreaterThan(0)
    expect(mateStateAt(holdEnd(0))).toMatchObject({ fill: 1, pour: 0, slope: 1 })
  })

  it('interpola por tramo con la curva quíntica: a mitad de camino en el medio, despacio al principio', () => {
    const from = moment('lleno')
    const to = moment('bombilla')
    const start = keyframe('lleno').to
    const middle = mateStateAt(start + (SPAN - start) / 2)
    expect(middle.mate[5]).toBeCloseTo((from.mate[5] + to.mate[5]) / 2, 6)
    expect(middle.wall).toBeCloseTo((from.wall + to.wall) / 2, 6)
    const quarter = mateStateAt(start + (SPAN - start) / 4)
    const quarterShare = (quarter.mate[5] - from.mate[5]) / (to.mate[5] - from.mate[5])
    expect(quarterShare).toBeGreaterThan(0)
    expect(quarterShare).toBeLessThan(0.25)
  })

  it('no salta en los bordes de los momentos: al volver atrás el scroll pasa por los mismos estados', () => {
    for (const { from, to, state } of MATE_KEYFRAMES) {
      for (const edge of [from, to]) {
        expectClose(mateStateAt(Math.max(0, edge - 1e-7)), state)
        expectClose(mateStateAt(Math.min(1, edge + 1e-7)), state)
      }
    }
  })

  it('lanza RangeError si el avance no es un número de 0 a 1', () => {
    for (const progress of [Number.NaN, -0.01, 1.01, Number.POSITIVE_INFINITY]) {
      expect(() => mateStateAt(progress)).toThrow(RangeError)
    }
    expect(() => mateStateAt(Number.NaN)).toThrow(/avance/)
  })
})

describe('lerpMateState', () => {
  it('va en línea recta de un estado al otro, campo por campo, sin tocar los recibidos', () => {
    const empty = moment('inicio')
    const pouring = moment('agua')
    const half = lerpMateState(empty, pouring, 0.5)
    expect(half.fill).toBeCloseTo(0.5)
    expect(half.slope).toBeCloseTo(0.5)
    expect(half.wall).toBeCloseTo(0.5)
    expect(half.puddle).toBeCloseTo(0.25)
    expect(half.splash).toBeCloseTo(0.5)
    expect(half.thermos[0]).toBeCloseTo((empty.thermos[0] + pouring.thermos[0]) / 2)
    expect(half.mate[0]).toBeCloseTo((empty.mate[0] + pouring.mate[0]) / 2)
    expect(lerpMateState(empty, pouring, 0)).toEqual(empty)
    expect(lerpMateState(empty, pouring, 1)).toEqual(pouring)
    expect(moment('inicio').fill).toBe(0)
  })

  it('lanza RangeError si la parte del camino no es un número de 0 a 1', () => {
    const empty = moment('inicio')
    for (const share of [Number.NaN, -0.5, 2]) {
      expect(() => lerpMateState(empty, empty, share)).toThrow(RangeError)
    }
  })
})
