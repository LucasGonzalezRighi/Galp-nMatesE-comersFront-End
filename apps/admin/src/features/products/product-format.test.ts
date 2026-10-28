import { describe, expect, it } from 'vitest'
import { priceText, stockBadge } from './product-format'

describe('priceText', () => {
  it('muestra el precio con formatPesos, o "A consultar" sin precio', () => {
    expect(priceText(39999)).toBe('$39.999')
    expect(priceText(null)).toBe('A consultar')
  })
})

describe('stockBadge', () => {
  it('"Sin stock" con 0 y "Poco stock" hasta el umbral', () => {
    expect(stockBadge(0, 3)).toEqual({ label: 'Sin stock', tone: 'danger' })
    expect(stockBadge(3, 3)).toEqual({ label: 'Poco stock', tone: 'accent' })
    expect(stockBadge(4, 3)).toBeNull()
  })

  it('sin el umbral (los ajustes no cargaron) solo marca el 0', () => {
    expect(stockBadge(2, null)).toBeNull()
    expect(stockBadge(0, null)).toEqual({ label: 'Sin stock', tone: 'danger' })
  })

  it('rechaza un stock imposible', () => {
    expect(() => stockBadge(-1, 3)).toThrow(RangeError)
    expect(() => stockBadge(1.5, 3)).toThrow(RangeError)
  })
})
