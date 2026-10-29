import { describe, expect, it } from 'vitest'
import {
  averageRating,
  formatRating,
  isValidRating,
  pluralize,
  ratingDistribution,
  STAR_WORDS,
} from './ratings'

describe('isValidRating', () => {
  it.each([1, 1.5, 3, 4.5, 5])('acepta %s, un múltiplo de 0,5 de 1 a 5', (rating) => {
    expect(isValidRating(rating)).toBe(true)
  })
  it.each([0, 0.5, 4.3, 5.5, 6, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza %s',
    (rating) => {
      expect(isValidRating(rating)).toBe(false)
    },
  )
})

describe('averageRating', () => {
  it('sin reseñas es 0', () => {
    expect(averageRating([])).toBe(0)
  })
  it('es el promedio simple de las puntuaciones', () => {
    expect(averageRating([5, 5, 4])).toBeCloseTo(4.6667, 4)
    expect(averageRating([1, 2, 3, 4, 5])).toBe(3)
    expect(averageRating([4])).toBe(4)
  })
  it('acepta medias estrellas', () => {
    expect(averageRating([4.5, 5])).toBe(4.75)
    expect(averageRating([4.5])).toBe(4.5)
  })
  it.each([0, 0.5, 4.3, 5.5, 6, -1, Number.NaN])(
    'rechaza la puntuación %s, que no es un múltiplo de 0,5 de 1 a 5',
    (value) => {
      expect(() => averageRating([5, value])).toThrow(RangeError)
    },
  )
  it('el mensaje de error está en español', () => {
    expect(() => averageRating([6])).toThrow(
      'La puntuación tiene que ser un múltiplo de 0,5 de 1 a 5; se recibió 6.',
    )
  })
})

describe('formatRating', () => {
  it('muestra un decimal con coma', () => {
    expect(formatRating(averageRating([5, 5, 4]))).toBe('4,7')
    expect(formatRating(5)).toBe('5,0')
    expect(formatRating(3)).toBe('3,0')
    expect(formatRating(0)).toBe('0,0')
  })
  it('redondea el medio hacia arriba', () => {
    expect(formatRating(4.25)).toBe('4,3')
    expect(formatRating(4.24)).toBe('4,2')
  })
  it.each([-0.1, 5.1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza un promedio de %s, fuera de 0 a 5',
    (average) => {
      expect(() => formatRating(average)).toThrow(RangeError)
    },
  )
  it('el mensaje de error está en español', () => {
    expect(() => formatRating(6)).toThrow(
      'El promedio tiene que ser un número entre 0 y 5; se recibió 6.',
    )
  })
})

describe('ratingDistribution', () => {
  it('lista de 5 a 1 estrellas con cantidad y porcentaje redondeado', () => {
    expect(ratingDistribution([5, 5, 4])).toEqual([
      { stars: 5, count: 2, percent: 67 },
      { stars: 4, count: 1, percent: 33 },
      { stars: 3, count: 0, percent: 0 },
      { stars: 2, count: 0, percent: 0 },
      { stars: 1, count: 0, percent: 0 },
    ])
  })
  it('sin reseñas todos los porcentajes son 0', () => {
    expect(ratingDistribution([])).toEqual([
      { stars: 5, count: 0, percent: 0 },
      { stars: 4, count: 0, percent: 0 },
      { stars: 3, count: 0, percent: 0 },
      { stars: 2, count: 0, percent: 0 },
      { stars: 1, count: 0, percent: 0 },
    ])
  })
  it('cuenta cada puntuación en su fila', () => {
    const distribution = ratingDistribution([1, 1, 2, 3, 3, 3, 4, 5, 5, 5])
    expect(distribution.map((row) => row.count)).toEqual([3, 1, 3, 1, 2])
    expect(distribution.map((row) => row.percent)).toEqual([30, 10, 30, 10, 20])
  })
  it('una única puntuación ocupa el 100%', () => {
    expect(ratingDistribution([3])[2]).toEqual({ stars: 3, count: 1, percent: 100 })
  })
  it('una media estrella cuenta en la fila de su parte entera', () => {
    expect(ratingDistribution([4.5, 5])).toEqual([
      { stars: 5, count: 1, percent: 50 },
      { stars: 4, count: 1, percent: 50 },
      { stars: 3, count: 0, percent: 0 },
      { stars: 2, count: 0, percent: 0 },
      { stars: 1, count: 0, percent: 0 },
    ])
    expect(ratingDistribution([1.5])[4]).toEqual({ stars: 1, count: 1, percent: 100 })
  })
  it('rechaza puntuaciones que no son múltiplos de 0,5 de 1 a 5', () => {
    expect(() => ratingDistribution([5, 0])).toThrow(RangeError)
    expect(() => ratingDistribution([2.3])).toThrow(RangeError)
    expect(() => ratingDistribution([5.5])).toThrow(RangeError)
  })
})

describe('STAR_WORDS', () => {
  it('son las cinco palabras del formulario, de 1 a 5 estrellas', () => {
    expect(STAR_WORDS).toEqual(['Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'])
  })
})

describe('pluralize', () => {
  it('usa el singular solo con 1', () => {
    expect(pluralize(1, 'reseña', 'reseñas')).toBe('1 reseña')
  })
  it('usa el plural con 0 y con más de 1', () => {
    expect(pluralize(0, 'reseña', 'reseñas')).toBe('0 reseñas')
    expect(pluralize(2, 'reseña', 'reseñas')).toBe('2 reseñas')
    expect(pluralize(12, 'producto', 'productos')).toBe('12 productos')
  })
  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza una cantidad de %s, que no es un entero mayor o igual a 0',
    (count) => {
      expect(() => pluralize(count, 'reseña', 'reseñas')).toThrow(RangeError)
    },
  )
  it('el mensaje de error está en español', () => {
    expect(() => pluralize(-1, 'reseña', 'reseñas')).toThrow(
      'La cantidad tiene que ser un entero mayor o igual a 0; se recibió -1.',
    )
  })
})
