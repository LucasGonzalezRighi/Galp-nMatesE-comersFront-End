import { describe, expect, it } from 'vitest'
import { photoPlaceholder } from './product.copy'

describe('photoPlaceholder', () => {
  it('numera la foto y nombra el producto como el diseño', () => {
    expect(photoPlaceholder(1, 'Mate Galleta')).toBe('Foto 1 · Mate Galleta')
    expect(photoPlaceholder(3, 'Mate Galleta')).toBe('Foto 3 · Mate Galleta')
  })

  it.each([[0], [-1], [1.5], [Number.NaN]])('rechaza el número de foto %s', (position) => {
    expect(() => photoPlaceholder(position, 'Mate Galleta')).toThrow(RangeError)
  })
})
