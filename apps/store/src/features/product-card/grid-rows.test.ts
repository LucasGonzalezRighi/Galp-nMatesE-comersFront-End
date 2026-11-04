import { describe, expect, it } from 'vitest'
import { countGridColumns, visibleProductLimit } from './grid-rows'

describe('countGridColumns', () => {
  it('cuenta las pistas resueltas de grid-template-columns', () => {
    expect(countGridColumns('250px 250px 250px 250px 250px 250px')).toBe(6)
    expect(countGridColumns('  318.5px   318.5px ')).toBe(2)
    expect(countGridColumns('358px')).toBe(1)
  })

  it('ignora los nombres de línea', () => {
    expect(countGridColumns('[inicio] 250px [medio] 250px [fin]')).toBe(2)
  })

  it('sin grilla medida ("", "none" o la plantilla sin resolver) devuelve null', () => {
    expect(countGridColumns('')).toBeNull()
    expect(countGridColumns('none')).toBeNull()
    expect(countGridColumns('repeat(auto-fill, minmax(min(100%, 250px), 1fr))')).toBeNull()
  })
})

describe('visibleProductLimit', () => {
  it('son las hileras completas de las columnas que entran', () => {
    expect(visibleProductLimit(5, 4)).toBe(20)
    expect(visibleProductLimit(1, 3)).toBe(3)
    expect(visibleProductLimit(5, 3)).toBe(15)
    expect(visibleProductLimit(3, 2)).toBe(6)
  })

  it('rechaza columnas o hileras que no son enteros positivos', () => {
    expect(() => visibleProductLimit(0, 4)).toThrow(RangeError)
    expect(() => visibleProductLimit(2.5, 4)).toThrow(RangeError)
    expect(() => visibleProductLimit(Number.NaN, 4)).toThrow(RangeError)
    expect(() => visibleProductLimit(4, 0)).toThrow(RangeError)
    expect(() => visibleProductLimit(4, -1)).toThrow(RangeError)
    expect(() => visibleProductLimit(4, 1.5)).toThrow(RangeError)
  })
})
