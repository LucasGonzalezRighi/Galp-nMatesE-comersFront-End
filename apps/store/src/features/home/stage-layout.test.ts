import { describe, expect, it } from 'vitest'
import { HOLD_SHARE, stageLayout } from './stage-layout'

describe('stageLayout', () => {
  it('al principio la primera parada está quieta y sin avanzar', () => {
    expect(stageLayout(0, 6)).toEqual({ index: 0, trackX: 0, holdProgress: 0 })
  })

  it('durante el 55 % inicial del tramo la parada se queda quieta y avanza su `holdProgress`', () => {
    const span = 1 / 4
    const middle = stageLayout(span * (HOLD_SHARE / 2), 4)
    expect(middle.index).toBe(0)
    expect(middle.trackX).toBe(0)
    expect(middle.holdProgress).toBeCloseTo(0.5)
    const endOfHold = stageLayout(span * HOLD_SHARE, 4)
    expect(endOfHold.trackX).toBe(0)
    expect(endOfHold.holdProgress).toBeCloseTo(1)
  })

  it('en el 45 % restante se desliza a la siguiente con una curva suave', () => {
    const span = 1 / 4
    const slide = (share: number): number =>
      stageLayout(span * (HOLD_SHARE + (1 - HOLD_SHARE) * share), 4).trackX
    // Arranca y termina despacio: a un cuarto del deslizamiento recorrió menos de un cuarto.
    expect(-slide(0.25)).toBeLessThan(0.25)
    expect(-slide(0.5)).toBeCloseTo(0.5)
    expect(-slide(0.75)).toBeGreaterThan(0.75)
    expect(slide(0.25)).toBeLessThan(0)
  })

  it('la parada actual cambia a mitad del deslizamiento', () => {
    const span = 1 / 4
    const at = (share: number): number =>
      stageLayout(span * (HOLD_SHARE + (1 - HOLD_SHARE) * share), 4).index
    expect(at(0.4)).toBe(0)
    expect(at(0.6)).toBe(1)
  })

  it('al llegar al tramo de la segunda parada la pista está un ancho de ventana corrida', () => {
    expect(stageLayout(0.25, 4)).toEqual({ index: 1, trackX: -1, holdProgress: 0 })
    expect(stageLayout(0.5, 4).trackX).toBe(-2)
  })

  it('la última parada se queda quieta todo su tramo y termina en 1', () => {
    expect(stageLayout(0.8, 4)).toEqual({
      index: 3,
      trackX: -3,
      holdProgress: expect.closeTo(0.2) as number,
    })
    expect(stageLayout(1, 4)).toEqual({ index: 3, trackX: -3, holdProgress: 1 })
  })

  it('recorta el avance fuera de 0 a 1', () => {
    expect(stageLayout(-0.3, 3)).toEqual(stageLayout(0, 3))
    expect(stageLayout(1.4, 3)).toEqual(stageLayout(1, 3))
  })

  it('con una sola parada nunca se desliza', () => {
    expect(stageLayout(0.5, 1)).toEqual({ index: 0, trackX: 0, holdProgress: 0.5 })
  })

  it('lanza RangeError con un avance que no es un número o una cantidad inválida', () => {
    expect(() => stageLayout(Number.NaN, 6)).toThrow(RangeError)
    expect(() => stageLayout(0.5, 0)).toThrow(RangeError)
    expect(() => stageLayout(0.5, 2.5)).toThrow(RangeError)
  })
})
