import { describe, expect, it } from 'vitest'
import { lineOptionsText } from './orders.copy'

describe('lineOptionsText', () => {
  it('nombra solo el cuero, sin virola', () => {
    expect(lineOptionsText('Negro')).toBe('Cuero Negro')
    expect(lineOptionsText('Marrón')).toBe('Cuero Marrón')
  })

  it('rechaza un cuero vacío', () => {
    expect(() => lineOptionsText(' ')).toThrow(RangeError)
  })
})
