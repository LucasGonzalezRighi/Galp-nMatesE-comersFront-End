import { describe, expect, it } from 'vitest'
import { isSlugShaped, SLUG_MAX_LENGTH } from './slug'

describe('isSlugShaped', () => {
  it.each(['mate-imperial', 'a', 'yerba-1-kg', 'a'.repeat(SLUG_MAX_LENGTH)])(
    'acepta "%s"',
    (slug) => {
      expect(isSlugShaped(slug)).toBe(true)
    },
  )

  it.each([
    '',
    'Mate',
    'mate--imperial',
    '-mate',
    'mate-',
    'mate_imperial',
    'mate%20imperial',
    '..',
    '_',
    'a'.repeat(SLUG_MAX_LENGTH + 1),
  ])('rechaza "%s"', (slug) => {
    expect(isSlugShaped(slug)).toBe(false)
  })
})
