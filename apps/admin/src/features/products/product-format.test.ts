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
    expect(stockBadge(0, 3, 'published')).toEqual({ label: 'Sin stock', tone: 'danger' })
    expect(stockBadge(3, 3, 'published')).toEqual({ label: 'Poco stock', tone: 'accent' })
    expect(stockBadge(4, 3, 'published')).toBeNull()
  })

  it('"Poco stock" solo en los publicados; "Sin stock" en cualquier estado', () => {
    expect(stockBadge(2, 3, 'draft')).toBeNull()
    expect(stockBadge(2, 3, 'archived')).toBeNull()
    expect(stockBadge(0, 3, 'draft')).toEqual({ label: 'Sin stock', tone: 'danger' })
    expect(stockBadge(0, 3, 'archived')).toEqual({ label: 'Sin stock', tone: 'danger' })
  })

  it('sin el umbral (los ajustes no cargaron) solo marca el 0', () => {
    expect(stockBadge(2, null, 'published')).toBeNull()
    expect(stockBadge(0, null, 'published')).toEqual({ label: 'Sin stock', tone: 'danger' })
  })

  it('rechaza un stock imposible', () => {
    expect(() => stockBadge(-1, 3, 'published')).toThrow(RangeError)
    expect(() => stockBadge(1.5, 3, 'published')).toThrow(RangeError)
  })
})
