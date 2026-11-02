import { describe, expect, it } from 'vitest'
import type { AdminReview } from '@galpon/api-client'
import { availableReviewActions, REVIEW_ACTIONS, reviewAfter } from './review-actions'

describe('availableReviewActions', () => {
  it('una pendiente se aprueba (principal) o se oculta', () => {
    expect(availableReviewActions({ status: 'pending', featured: false })).toEqual([
      'approve',
      'hide',
    ])
    expect(REVIEW_ACTIONS.approve.variant).toBe('primary')
  })

  it('una aprobada se destaca o se quita de destacadas, y se oculta', () => {
    expect(availableReviewActions({ status: 'approved', featured: false })).toEqual([
      'feature',
      'hide',
    ])
    expect(availableReviewActions({ status: 'approved', featured: true })).toEqual([
      'unfeature',
      'hide',
    ])
  })

  it('una oculta se aprueba o vuelve a pendientes', () => {
    expect(availableReviewActions({ status: 'hidden', featured: true })).toEqual([
      'approve',
      'restore',
    ])
  })

  it('un estado desconocido lanza RangeError', () => {
    const review = { status: 'deleted', featured: false } as unknown as Pick<
      AdminReview,
      'status' | 'featured'
    >
    expect(() => availableReviewActions(review)).toThrow(RangeError)
  })
})

describe('reviewAfter', () => {
  it('aplica solo lo que cambia la acción', () => {
    expect(reviewAfter({ status: 'pending', featured: false }, 'approve')).toEqual({
      status: 'approved',
      featured: false,
    })
    expect(reviewAfter({ status: 'approved', featured: false }, 'feature')).toEqual({
      status: 'approved',
      featured: true,
    })
    expect(reviewAfter({ status: 'hidden', featured: true }, 'restore')).toEqual({
      status: 'pending',
      featured: true,
    })
  })
})
