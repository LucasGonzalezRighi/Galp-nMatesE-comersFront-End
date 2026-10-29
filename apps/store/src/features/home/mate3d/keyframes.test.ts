import { describe, expect, it } from 'vitest'
import type { MateMoment, MateState } from './keyframes'
import { HOLD_SHARE } from '../stage-layout'
import { lerpMateState, MATE_KEYFRAMES, mateStateAt } from './keyframes'

/** Tramo del avance que ocupa cada una de las tres paradas. */
const SPAN = 1 / 3

/** Avance en que termina el hold de una parada (desde 0). */
function holdEnd(stop: number): number {
  return SPAN * (stop + HOLD_SHARE)
}

/** El estado de un momento de la lista. */
function moment(name: MateMoment): MateState {
  const keyframe = MATE_KEYFRAMES.find((candidate) => candidate.name === name)
  if (keyframe === undefined) throw new Error(`Falta el momento ${name}`)
  return keyframe.state
}

/** Los números de un estado, en orden, para compararlos de a uno. */
function flatten(state: MateState): number[] {
  return [
    ...state.mate,
    ...state.bombilla,
    ...state.pack,
    state.attached,
    state.fill,
    state.mound,
    state.wet,
    state.water,
    state.steam,
    state.pour,
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

describe('mateStateAt', () => {
  it('en 0 es la portada: el mate vacío, sin yerba, sin bombilla calzada y sin agua', () => {
    const state = mateStateAt(0)
    expect(state).toEqual(moment('inicio'))
    expect(state).toMatchObject({ fill: 0, mound: 0, pour: 0, attached: 0, water: 0, steam: 0 })
    // El mate está a la derecha, como la foto de la portada.
    expect(state.mate[0]).toBeGreaterThan(0.3)
  })

  it('en 1 es la salida: el mate se aleja hacia la derecha y abajo', () => {
    const exit = mateStateAt(1)
    const water = moment('agua')
    expect(exit).toEqual(moment('salida'))
    expect(exit.mate[0]).toBeGreaterThan(water.mate[0])
    expect(exit.mate[1]).toBeLessThan(water.mate[1])
    expect(exit.mate[2]).toBeLessThan(water.mate[2])
  })

  it('en el hold de la parada 1 el paquete vuelca: cae la yerba y el mate se va llenando', () => {
    const fills = [0.2, 0.4, 0.6, 0.8].map((share) => mateStateAt(holdEnd(0) * share).fill)
    expect(fills).toEqual([...fills].sort((a, b) => a - b))
    expect(fills[0]).toBeGreaterThan(0)
    expect(fills.at(-1)).toBeLessThan(1)
    expect(mateStateAt(holdEnd(0) / 2).pour).toBeGreaterThan(0.5)
  })

  it('al terminar el hold de la parada 1 el mate está lleno con su montañita y ya no cae yerba', () => {
    expect(mateStateAt(holdEnd(0))).toMatchObject({ fill: 1, mound: 1, pour: 0, attached: 0 })
  })

  it('la parada 2 llega con la bombilla calzada y se queda quieta durante su hold', () => {
    const arrival = mateStateAt(SPAN)
    expect(arrival).toMatchObject({ attached: 1, fill: 1, mound: 1, pour: 0, water: 0 })
    expect(arrival.tilt).not.toBe(0)
    expect(mateStateAt(SPAN + (holdEnd(1) - SPAN) / 2)).toEqual(arrival)
    expect(mateStateAt(holdEnd(1))).toEqual(arrival)
  })

  it('la parada 3 llega con el chorro de agua, la yerba húmeda y el vapor', () => {
    const arrival = mateStateAt(2 * SPAN)
    expect(arrival).toMatchObject({ water: 1, steam: 1, wet: 1, attached: 1 })
    expect(mateStateAt(holdEnd(2))).toEqual(arrival)
  })

  it('cada parada del raíl (el principio de su tramo) muestra su momento completo', () => {
    expect(mateStateAt(0)).toEqual(moment('inicio'))
    expect(mateStateAt(SPAN)).toEqual(moment('bombilla'))
    expect(mateStateAt(2 * SPAN)).toEqual(moment('agua'))
  })

  it('interpola por tramo con la curva quíntica: a mitad de camino en el medio, despacio al principio', () => {
    const from = moment('lleno')
    const to = moment('bombilla')
    const start = holdEnd(0)
    const middle = mateStateAt(start + (SPAN - start) / 2)
    expect(middle.mate[2]).toBeCloseTo((from.mate[2] + to.mate[2]) / 2, 6)
    const quarter = mateStateAt(start + (SPAN - start) / 4)
    const quarterShare = (quarter.mate[4] - from.mate[4]) / (to.mate[4] - from.mate[4])
    expect(quarterShare).toBeGreaterThan(0)
    expect(quarterShare).toBeLessThan(0.25)
  })

  it('no salta en los bordes de los momentos: al volver atrás el scroll pasa por los mismos estados', () => {
    for (const keyframe of MATE_KEYFRAMES) {
      for (const edge of [keyframe.from, keyframe.to]) {
        expectClose(mateStateAt(Math.max(0, edge - 1e-7)), keyframe.state)
        expectClose(mateStateAt(Math.min(1, edge + 1e-7)), keyframe.state)
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
  it('va en línea recta de un estado al otro sin tocar los recibidos', () => {
    const empty = moment('inicio')
    const full = moment('lleno')
    const half = lerpMateState(empty, full, 0.5)
    expect(half.fill).toBeCloseTo(0.5)
    expect(half.mate[0]).toBeCloseTo((empty.mate[0] + full.mate[0]) / 2)
    expect(lerpMateState(empty, full, 0)).toEqual(empty)
    expect(lerpMateState(empty, full, 1)).toEqual(full)
    expect(moment('inicio').fill).toBe(0)
  })

  it('lanza RangeError si la parte del camino no es un número de 0 a 1', () => {
    const empty = moment('inicio')
    for (const share of [Number.NaN, -0.5, 2]) {
      expect(() => lerpMateState(empty, empty, share)).toThrow(RangeError)
    }
  })
})

describe('MATE_KEYFRAMES', () => {
  it('van en orden, sin solaparse, de 0 a 1', () => {
    expect(MATE_KEYFRAMES[0].from).toBe(0)
    expect(MATE_KEYFRAMES.at(-1)?.to).toBe(1)
    let previous = -1
    for (const keyframe of MATE_KEYFRAMES) {
      expect(keyframe.from).toBeGreaterThan(previous)
      expect(keyframe.to).toBeGreaterThanOrEqual(keyframe.from)
      previous = keyframe.to
    }
  })

  it('los valores entre 0 y 1 del estado nunca se salen de ese rango', () => {
    for (const { state } of MATE_KEYFRAMES) {
      const unit = [state.attached, state.fill, state.mound, state.wet, state.water, state.steam]
      for (const value of [...unit, state.pour]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })
})
