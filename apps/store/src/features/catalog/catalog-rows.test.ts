import { describe, expect, it } from 'vitest'
import {
  CATALOG_DEFAULT_COLUMNS,
  CATALOG_ROWS,
  countGridColumns,
  visibleProductLimit,
} from './catalog-rows'

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
  it('son cuatro hileras completas de las columnas que entran', () => {
    expect(CATALOG_ROWS).toBe(4)
    expect(visibleProductLimit(6)).toBe(24)
    expect(visibleProductLimit(1)).toBe(4)
    expect(visibleProductLimit(3, 2)).toBe(6)
  })

  it('antes de medir se suponen 6 columnas: 24 productos', () => {
    expect(visibleProductLimit(CATALOG_DEFAULT_COLUMNS)).toBe(24)
  })

  it('rechaza columnas o hileras que no son enteros positivos', () => {
    expect(() => visibleProductLimit(0)).toThrow(RangeError)
    expect(() => visibleProductLimit(2.5)).toThrow(RangeError)
    expect(() => visibleProductLimit(Number.NaN)).toThrow(RangeError)
    expect(() => visibleProductLimit(4, 0)).toThrow(RangeError)
    expect(() => visibleProductLimit(4, -1)).toThrow(RangeError)
  })
})
