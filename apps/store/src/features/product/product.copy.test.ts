import { describe, expect, it } from 'vitest'
import { photoButtonLabel, photoPlaceholder } from './product.copy'

describe('photoPlaceholder', () => {
  it('numera la foto y nombra el producto como el diseño', () => {
    expect(photoPlaceholder(1, 'Mate Galleta')).toBe('Foto 1 · Mate Galleta')
    expect(photoPlaceholder(3, 'Mate Galleta')).toBe('Foto 3 · Mate Galleta')
  })

  it.each([[0], [-1], [1.5], [Number.NaN]])('rechaza el número de foto %s', (position) => {
    expect(() => photoPlaceholder(position, 'Mate Galleta')).toThrow(RangeError)
  })
})

describe('photoButtonLabel', () => {
  it('nombra la miniatura con el mismo número de dos cifras que se ve en el botón', () => {
    expect(photoButtonLabel(1)).toBe('Ver la foto 01')
    expect(photoButtonLabel(12)).toBe('Ver la foto 12')
  })

  it.each([[0], [-1], [1.5], [Number.NaN]])('rechaza el número de foto %s', (position) => {
    expect(() => photoButtonLabel(position)).toThrow(RangeError)
  })
})
