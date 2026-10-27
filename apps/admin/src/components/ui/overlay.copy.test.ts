import { describe, expect, it } from 'vitest'
import {
  pageOf,
  reorderAnnouncement,
  showingRange,
  sortBy,
  uploadingProgress,
} from './overlay.copy'

describe('overlay.copy', () => {
  it('arma el nombre del botón de orden', () => {
    expect(sortBy('Precio')).toBe('Ordenar por Precio')
    expect(() => sortBy(' ')).toThrow(RangeError)
  })

  it('arma el rango y la página de la paginación', () => {
    expect(showingRange(21, 40, 45)).toBe('Mostrando 21–40 de 45')
    expect(pageOf(2, 3)).toBe('Página 2 de 3')
    expect(() => showingRange(0, 1, 1)).toThrow(RangeError)
    expect(() => showingRange(3, 2, 5)).toThrow(RangeError)
    expect(() => pageOf(4, 3)).toThrow(RangeError)
  })

  it('arma el progreso de una subida', () => {
    expect(uploadingProgress(40)).toBe('Subiendo… 40 %')
    expect(() => uploadingProgress(101)).toThrow(RangeError)
    expect(() => uploadingProgress(-1)).toThrow(RangeError)
  })

  it('arma el anuncio de un reordenamiento', () => {
    expect(reorderAnnouncement('Fotos', 2, 3)).toBe('Fotos: quedó en el lugar 2 de 3.')
    expect(() => reorderAnnouncement('Fotos', 4, 3)).toThrow(RangeError)
    expect(() => reorderAnnouncement('', 1, 3)).toThrow(RangeError)
  })
})
