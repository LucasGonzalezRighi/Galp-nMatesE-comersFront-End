import { describe, expect, it } from 'vitest'
import {
  formatNumberText,
  parseMoneyText,
  parseNumberText,
  sanitizeMoneyText,
  sanitizeNumberText,
} from './numeric-text'

describe('sanitizeMoneyText y parseMoneyText', () => {
  it.each([
    ['39999', 39999],
    ['39.999', 39999],
    ['$39.999', 39999],
    ['$ 39.999', 39999],
    ['0', 0],
  ])('"%s" vale %d', (text, expected) => {
    expect(parseMoneyText(text)).toBe(expected)
  })

  it.each([[''], ['$'], ['.'], ['abc']])('"%s" es un monto vacío (null)', (text) => {
    expect(parseMoneyText(text)).toBeNull()
  })

  it('ignora las letras y los espacios al escribir', () => {
    expect(sanitizeMoneyText('3a9 b')).toBe('39')
    expect(parseMoneyText('3a9 b')).toBe(39)
  })

  it('nunca tiene decimales: descarta lo que sigue a la coma', () => {
    expect(sanitizeMoneyText('$39.999,50')).toBe('$39.999')
    expect(parseMoneyText('$39.999,50')).toBe(39999)
  })

  it('no pasa de 15 cifras, para quedar dentro de los enteros seguros', () => {
    expect(parseMoneyText('9'.repeat(20))).toBe(Number('9'.repeat(15)))
  })
})

describe('sanitizeNumberText y parseNumberText', () => {
  it('entero: solo cifras; los puntos de miles se ignoran y la coma corta', () => {
    expect(parseNumberText('12', false)).toBe(12)
    expect(parseNumberText('1.200', false)).toBe(1200)
    expect(parseNumberText('10,5', false)).toBe(10)
    expect(sanitizeNumberText('1x2,5', false)).toBe('12')
  })

  it('con decimales: la coma es el separador decimal', () => {
    expect(parseNumberText('10,5', true)).toBe(10.5)
    expect(parseNumberText('1.234,25', true)).toBe(1234.25)
    expect(parseNumberText('10,', true)).toBe(10)
    expect(parseNumberText(',5', true)).toBe(0.5)
  })

  it('con decimales conserva solo la primera coma al escribir', () => {
    expect(sanitizeNumberText('10,5,2', true)).toBe('10,52')
    expect(sanitizeNumberText('1a0,5', true)).toBe('10,5')
  })

  it.each([[''], [','], ['.'], ['abc']])('"%s" es un número vacío (null)', (text) => {
    expect(parseNumberText(text, true)).toBeNull()
    expect(parseNumberText(text, false)).toBeNull()
  })
})

describe('formatNumberText', () => {
  it('muestra los decimales con coma y sin puntos de miles', () => {
    expect(formatNumberText(10.5)).toBe('10,5')
    expect(formatNumberText(1200)).toBe('1200')
  })

  it.each([[Number.NaN], [Number.POSITIVE_INFINITY]])(
    'rechaza %s con un RangeError en español',
    (value) => {
      expect(() => formatNumberText(value)).toThrow(RangeError)
    },
  )
})
