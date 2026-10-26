import { describe, expect, it } from 'vitest'
import { formatUpdatedAt, splitParagraphs } from './legal-text'

describe('splitParagraphs', () => {
  it('separa los párrafos por las líneas en blanco y recorta los espacios', () => {
    expect(splitParagraphs('  Primero.  \n\nSegundo.\r\n\r\n\n  Tercero.\n')).toEqual([
      'Primero.',
      'Segundo.',
      'Tercero.',
    ])
  })

  it('deja un salto de línea simple dentro del mismo párrafo', () => {
    expect(splitParagraphs('Línea uno\nLínea dos')).toEqual(['Línea uno\nLínea dos'])
  })

  it('devuelve una lista vacía si el texto está vacío', () => {
    expect(splitParagraphs('  \n\n ')).toEqual([])
  })
})

describe('formatUpdatedAt', () => {
  it('da el día como dd/mm/aaaa sin correrlo por la zona horaria', () => {
    expect(formatUpdatedAt('2026-10-01')).toBe('01/10/2026')
    expect(formatUpdatedAt('2026-12-31')).toBe('31/12/2026')
  })

  it('lanza RangeError si no es un día aaaa-mm-dd', () => {
    expect(() => formatUpdatedAt('01/10/2026')).toThrow(RangeError)
    expect(() => formatUpdatedAt('')).toThrow(RangeError)
  })
})
