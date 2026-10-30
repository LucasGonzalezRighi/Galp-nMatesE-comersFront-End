import { describe, expect, it } from 'vitest'
import {
  clampCover,
  easeInOutSine,
  FOOTER_ROW_SPAN,
  FOOTER_ROW_STAGGER,
  footerRowShare,
  footerWordProgress,
  WORD_STRIP_DROP,
  WORD_STRIPS_NARROW,
  WORD_STRIPS_WIDE,
  WORD_WAVE_SPREAD,
  wordStripClip,
  wordStripShare,
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

describe('footerWordProgress', () => {
  it('GALPÓN entra último: de la mitad del recorrido al final, lineal', () => {
    expect(footerWordProgress(0)).toBe(0)
    expect(footerWordProgress(0.5)).toBe(0)
    expect(footerWordProgress(0.75)).toBeCloseTo(0.5, 12)
    expect(footerWordProgress(1)).toBe(1)
  })

  it('lanza RangeError con un avance fuera de 0 a 1', () => {
    expect(() => footerWordProgress(2)).toThrow(RangeError)
    expect(() => footerWordProgress(Number.NaN)).toThrow(RangeError)
  })
})

describe('wordStripShare', () => {
  it('son 20 franjas en escritorio y 12 en el celular, desfasadas la mitad del recorrido', () => {
    expect(WORD_STRIPS_WIDE).toBe(20)
    expect(WORD_STRIPS_NARROW).toBe(12)
    expect(WORD_WAVE_SPREAD).toBe(0.5)
    expect(WORD_STRIP_DROP).toBe(70)
  })

  it('la primera sale sin atraso y está entera a la mitad; la última llega al final', () => {
    expect(wordStripShare(0, 0, 20)).toBe(0)
    expect(wordStripShare(0.25, 0, 20)).toBeCloseTo(0.5, 12)
    expect(wordStripShare(0.5, 0, 20)).toBeCloseTo(1, 12)
    // La última espera la mitad del recorrido.
    expect(wordStripShare(0.5, 19, 20)).toBe(0)
    expect(wordStripShare(0.75, 19, 20)).toBeCloseTo(0.5, 12)
    expect(wordStripShare(1, 19, 20)).toBeCloseTo(1, 12)
  })

  it('es una ola: en cada momento cada franja va más atrás que la de su izquierda', () => {
    for (const count of [WORD_STRIPS_WIDE, WORD_STRIPS_NARROW]) {
      for (const progress of [0.2, 0.4, 0.6, 0.8]) {
        const shares = Array.from({ length: count }, (_, index) =>
          wordStripShare(progress, index, count),
        )
        for (let index = 1; index < count; index += 1) {
          expect(shares[index]).toBeLessThanOrEqual(shares[index - 1] ?? 0)
        }
      }
      // Al final, todas enteras.
      for (let index = 0; index < count; index += 1) {
        expect(wordStripShare(1, index, count)).toBeCloseTo(1, 12)
      }
    }
  })

  it('con una sola franja no hay atraso', () => {
    expect(wordStripShare(0.5, 0, 1)).toBeCloseTo(1, 12)
  })

  it('lanza RangeError con un avance fuera de 0 a 1 o una franja que no existe', () => {
    expect(() => wordStripShare(1.1, 0, 20)).toThrow(RangeError)
    expect(() => wordStripShare(Number.NaN, 0, 20)).toThrow(RangeError)
    expect(() => wordStripShare(0.5, 20, 20)).toThrow(RangeError)
    expect(() => wordStripShare(0.5, -1, 20)).toThrow(RangeError)
    expect(() => wordStripShare(0.5, 0.5, 20)).toThrow(RangeError)
    expect(() => wordStripShare(0.5, 0, 0)).toThrow(RangeError)
  })
})

describe('wordStripClip', () => {
  it('cada franja recorta su tajada con medio píxel de solape contra sus vecinas', () => {
    expect(wordStripClip(0, 4)).toBe('inset(0 calc(75% - 0.5px) 0 0)')
    expect(wordStripClip(1, 4)).toBe('inset(0 calc(50% - 0.5px) 0 calc(25% - 0.5px))')
    expect(wordStripClip(3, 4)).toBe('inset(0 0 0 calc(75% - 0.5px))')
  })

  it('redondea los porcentajes a milésimas y la palabra entera es una sola franja sin recorte', () => {
    expect(wordStripClip(1, 12)).toBe('inset(0 calc(83.333% - 0.5px) 0 calc(8.333% - 0.5px))')
    expect(wordStripClip(0, 1)).toBe('inset(0 0 0 0)')
  })

  it('lanza RangeError con una franja que no existe', () => {
    expect(() => wordStripClip(12, 12)).toThrow(RangeError)
    expect(() => wordStripClip(0, 0)).toThrow(RangeError)
    expect(() => wordStripClip(Number.NaN, 4)).toThrow(RangeError)
  })
})

describe('clampCover', () => {
  it('recorta el avance de scroll de 0 a 1 y toma 0 si no es un número', () => {
    expect(clampCover(0.4)).toBe(0.4)
    expect(clampCover(1.0002)).toBe(1)
    expect(clampCover(-0.1)).toBe(0)
    expect(clampCover(Number.NaN)).toBe(0)
  })
})
