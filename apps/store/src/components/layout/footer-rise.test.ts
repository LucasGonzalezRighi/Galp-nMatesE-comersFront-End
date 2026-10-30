import { describe, expect, it } from 'vitest'
import {
  easeInOutSine,
  FOOTER_ROW_SPAN,
  FOOTER_ROW_STAGGER,
  footerRowShare,
  footerWordShare,
} from './footer-rise'

describe('easeInOutSine', () => {
  it('arranca y termina sin velocidad y pasa por la mitad en el medio', () => {
    expect(easeInOutSine(0)).toBe(0)
    expect(easeInOutSine(1)).toBeCloseTo(1, 12)
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5, 12)
    expect(easeInOutSine(0.1)).toBeLessThan(0.1)
    expect(easeInOutSine(0.9)).toBeGreaterThan(0.9)
  })

  it('recorta fuera de 0 a 1', () => {
    expect(easeInOutSine(-2)).toBe(0)
    expect(easeInOutSine(3)).toBeCloseTo(1, 12)
  })
})

describe('footerRowShare', () => {
  it('cada fila entra en su tramo, desfasado 0,12 de la anterior, con la curva senoidal', () => {
    expect(FOOTER_ROW_STAGGER).toBe(0.12)
    expect(FOOTER_ROW_SPAN).toBe(0.45)
    expect(footerRowShare(0.12, 0)).toBe(0)
    expect(footerRowShare(0.12 + 0.45 / 2, 0)).toBeCloseTo(0.5, 12)
    expect(footerRowShare(0.57, 0)).toBeCloseTo(1, 12)
    // La segunda fila va 0,12 más tarde.
    expect(footerRowShare(0.24, 1)).toBe(0)
    expect(footerRowShare(0.24 + 0.45 / 2, 1)).toBeCloseTo(0.5, 12)
  })

  it('la última fila (la 3) está entera antes de que el pie termine de subir', () => {
    expect(footerRowShare(0.93, 3)).toBeCloseTo(1, 12)
    expect(footerRowShare(1, 3)).toBeCloseTo(1, 12)
  })

  it('lanza RangeError con un avance fuera de 0 a 1 o una fila negativa', () => {
    expect(() => footerRowShare(-0.1, 0)).toThrow(RangeError)
    expect(() => footerRowShare(1.1, 0)).toThrow(RangeError)
    expect(() => footerRowShare(Number.NaN, 0)).toThrow(RangeError)
    expect(() => footerRowShare(0.5, -1)).toThrow(RangeError)
    expect(() => footerRowShare(0.5, Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('footerWordShare', () => {
  it('GALPÓN entra último: de la mitad del recorrido al final', () => {
    expect(footerWordShare(0)).toBe(0)
    expect(footerWordShare(0.5)).toBe(0)
    expect(footerWordShare(0.75)).toBeCloseTo(0.5, 12)
    expect(footerWordShare(1)).toBeCloseTo(1, 12)
  })

  it('lanza RangeError con un avance fuera de 0 a 1', () => {
    expect(() => footerWordShare(2)).toThrow(RangeError)
  })
})
