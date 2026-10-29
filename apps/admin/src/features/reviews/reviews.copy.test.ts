import { describe, expect, it } from 'vitest'
import { ratingLabel } from './reviews.copy'

describe('ratingLabel', () => {
  it('dice cuántas estrellas tiene la reseña', () => {
    expect(ratingLabel(1)).toBe('1 de 5 estrellas')
    expect(ratingLabel(5)).toBe('5 de 5 estrellas')
  })

  it('una media estrella va con coma decimal', () => {
    expect(ratingLabel(4.5)).toBe('4,5 de 5 estrellas')
    expect(ratingLabel(1.5)).toBe('1,5 de 5 estrellas')
  })

  it.each([0, 0.5, 4.3, 5.5, 6, Number.NaN])('lanza RangeError con %s', (rating) => {
    expect(() => ratingLabel(rating)).toThrow(RangeError)
  })

  it('el mensaje de error está en español', () => {
    expect(() => ratingLabel(4.3)).toThrow(
      'La puntuación tiene que ser un múltiplo de 0,5 de 1 a 5; se recibió 4.3.',
    )
  })
})
