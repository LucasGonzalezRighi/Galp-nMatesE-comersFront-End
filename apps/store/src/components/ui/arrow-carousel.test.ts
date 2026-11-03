import { describe, expect, it } from 'vitest'
import { counterLabel, indexAtScroll, positionLabel, stepIndex } from './arrow-carousel'

describe('stepIndex', () => {
  it('pasa a la tarjeta de al lado y da la vuelta en los extremos', () => {
    expect(stepIndex(2, 1, 7)).toBe(3)
    expect(stepIndex(2, -1, 7)).toBe(1)
    expect(stepIndex(6, 1, 7)).toBe(0)
    expect(stepIndex(0, -1, 7)).toBe(6)
    expect(stepIndex(0, 1, 1)).toBe(0)
  })

  it('valida la cantidad y la posición con RangeError', () => {
    expect(() => stepIndex(0, 1, 0)).toThrow(RangeError)
    expect(() => stepIndex(7, 1, 7)).toThrow(RangeError)
    expect(() => stepIndex(-1, 1, 7)).toThrow(RangeError)
    expect(() => stepIndex(1.5, 1, 7)).toThrow(RangeError)
  })
})

describe('counterLabel y positionLabel', () => {
  it('el contador va con dos dígitos como mínimo, contando desde 1', () => {
    expect(counterLabel(2, 7)).toBe('03 / 07')
    expect(counterLabel(0, 1)).toBe('01 / 01')
    expect(counterLabel(99, 120)).toBe('100 / 120')
  })

  it('la posición para el lector de pantalla es "3 de 7"', () => {
    expect(positionLabel(2, 7)).toBe('3 de 7')
  })

  it('validan la posición y la cantidad con RangeError', () => {
    expect(() => counterLabel(7, 7)).toThrow(RangeError)
    expect(() => counterLabel(0, 0)).toThrow(RangeError)
    expect(() => positionLabel(-1, 3)).toThrow(RangeError)
  })
})

describe('indexAtScroll', () => {
  const starts = [0, 460, 920, 1380, 1840, 2300, 2760]
  const scroll = { maxScrollLeft: 1700, starts }

  it('la tarjeta actual es la que quedó más cerca del comienzo de la fila', () => {
    expect(indexAtScroll({ ...scroll, scrollLeft: 0 }, 3)).toBe(0)
    expect(indexAtScroll({ ...scroll, scrollLeft: 470 }, 0)).toBe(1)
    expect(indexAtScroll({ ...scroll, scrollLeft: 700 }, 6)).toBe(2)
  })

  it('al final de la fila no retrocede si una flecha ya pasó a una de las últimas', () => {
    expect(indexAtScroll({ ...scroll, scrollLeft: 1700 }, 6)).toBe(6)
    expect(indexAtScroll({ ...scroll, scrollLeft: 1700 }, 1)).toBe(4)
  })

  it('valida la medida con RangeError', () => {
    expect(() => indexAtScroll({ ...scroll, starts: [], scrollLeft: 0 }, 0)).toThrow(RangeError)
    expect(() => indexAtScroll({ ...scroll, scrollLeft: Number.NaN }, 0)).toThrow(RangeError)
  })
})
