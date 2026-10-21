import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Review, ReviewInput } from './review'
import { reviewSchema } from './review'
import { issuesOf } from './test/helpers'

const validReview = { rating: 5, authorName: 'Lucía', text: 'Un mate hermoso, muy bien curado.' }

describe('reviewSchema', () => {
  it('normaliza y devuelve cada campo', () => {
    expect(reviewSchema.parse({ ...validReview, authorName: ' Lucía ', website: '' })).toEqual({
      rating: 5,
      authorName: 'Lucía',
      text: 'Un mate hermoso, muy bien curado.',
      website: '',
    })
  })

  it.each([1, 3, 5])('acepta %j estrellas', (rating) => {
    expect(reviewSchema.parse({ ...validReview, rating }).rating).toBe(rating)
  })

  it.each([0, 6, -1, 3.5, '4', Number.NaN, null, undefined])(
    'pide una puntuación de 1 a 5 si llega %j',
    (rating) => {
      expect(issuesOf(reviewSchema, { ...validReview, rating })).toEqual([
        { path: ['rating'], message: 'Elegí una puntuación de 1 a 5 estrellas.' },
      ])
    },
  )

  it.each(['', 'a'.repeat(9), `  ${'a'.repeat(8)}  `, undefined, 7])(
    'pide más texto si llega %j',
    (text) => {
      expect(issuesOf(reviewSchema, { ...validReview, text })).toEqual([
        { path: ['text'], message: 'Contanos un poco más (mínimo 10 caracteres)' },
      ])
    },
  )

  it('acepta un texto de 10 a 600 caracteres y rechaza uno más', () => {
    expect(reviewSchema.safeParse({ ...validReview, text: 'a'.repeat(10) }).success).toBe(true)
    expect(reviewSchema.safeParse({ ...validReview, text: 'a'.repeat(600) }).success).toBe(true)
    expect(issuesOf(reviewSchema, { ...validReview, text: 'a'.repeat(601) })).toEqual([
      { path: ['text'], message: 'Máximo 600 caracteres' },
    ])
  })

  it.each(['', '   ', undefined])('el nombre vacío o ausente (%j) sale como "Anónimo"', (name) => {
    expect(reviewSchema.parse({ ...validReview, authorName: name }).authorName).toBe('Anónimo')
  })

  it('acepta un nombre de hasta 40 caracteres y rechaza uno más', () => {
    expect(reviewSchema.parse({ ...validReview, authorName: 'a'.repeat(40) }).authorName).toBe(
      'a'.repeat(40),
    )
    expect(issuesOf(reviewSchema, { ...validReview, authorName: 'a'.repeat(41) })).toEqual([
      { path: ['authorName'], message: 'Máximo 40 caracteres' },
    ])
  })

  it('rechaza el campo trampa con contenido', () => {
    expect(
      issuesOf(reviewSchema, { ...validReview, website: 'https://spam.example' }),
    ).toHaveLength(1)
  })

  it('tiene tipos de entrada y de salida distintos', () => {
    expectTypeOf<ReviewInput['authorName']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Review['authorName']>().toEqualTypeOf<string>()
    expectTypeOf<Review['rating']>().toEqualTypeOf<number>()
  })
})
