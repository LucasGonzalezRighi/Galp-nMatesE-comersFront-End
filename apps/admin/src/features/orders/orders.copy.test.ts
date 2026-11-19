import { describe, expect, it } from 'vitest'
import { lineOptionsText } from './orders.copy'

describe('lineOptionsText', () => {
  it('nombra solo el cuero, sin virola', () => {
    expect(lineOptionsText('Negro')).toBe('Color Negro')
    expect(lineOptionsText('Marrón')).toBe('Color Marrón')
  })

  it('rechaza un cuero vacío', () => {
    expect(() => lineOptionsText(' ')).toThrow(RangeError)
  })
})
