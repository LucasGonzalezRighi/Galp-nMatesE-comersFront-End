import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from './redirect'

describe('safeRedirectPath', () => {
  it.each(['/productos', '/productos?page=2#lista', '/'])(
    'deja pasar la ruta interna %s',
    (path) => {
      expect(safeRedirectPath(path)).toBe(path)
    },
  )

  it.each([
    ['//evil.com'],
    ['https://evil.com'],
    ['/\\evil.com'],
    ['/\u0009/evil.com'],
    ['/a\u000ab'],
    ['productos'],
    [''],
    [undefined],
    [null],
    [42],
  ])('vuelve a "/" con %j', (value) => {
    expect(safeRedirectPath(value)).toBe('/')
  })
})
