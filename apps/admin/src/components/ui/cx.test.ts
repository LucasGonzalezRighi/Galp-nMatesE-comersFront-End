import { describe, expect, it } from 'vitest'
import { cx } from './cx'

describe('cx', () => {
  it('une las clases con un espacio', () => {
    expect(cx('flex', 'gap-2')).toBe('flex gap-2')
  })

  it('descarta los valores falsos, nulos, indefinidos y vacíos', () => {
    expect(cx('flex', false, null, undefined, '', 'gap-2')).toBe('flex gap-2')
  })

  it('sin clases devuelve un texto vacío', () => {
    expect(cx()).toBe('')
  })
})
