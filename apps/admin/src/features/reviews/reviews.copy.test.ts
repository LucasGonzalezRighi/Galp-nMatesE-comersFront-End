import { describe, expect, it } from 'vitest'
import { ratingLabel } from './reviews.copy'

describe('ratingLabel', () => {
  it('dice cuántas estrellas tiene la reseña', () => {
    expect(ratingLabel(1)).toBe('1 de 5 estrellas')
    expect(ratingLabel(5)).toBe('5 de 5 estrellas')
  })

  it.each([0, 6, 4.5, Number.NaN])('lanza RangeError con %s', (rating) => {
    expect(() => ratingLabel(rating)).toThrow(RangeError)
  })
})
