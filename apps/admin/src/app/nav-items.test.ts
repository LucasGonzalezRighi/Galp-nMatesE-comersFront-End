import { describe, expect, it } from 'vitest'
import { isSectionActive, NAV_ITEMS } from './nav-items'

describe('NAV_ITEMS', () => {
  it('lleva "Combos" a /combos, justo después de "Líneas" y sin contador', () => {
    const labels = NAV_ITEMS.map((item) => item.label)
    expect(labels.indexOf('Combos')).toBe(labels.indexOf('Líneas') + 1)
    expect(NAV_ITEMS.find((item) => item.label === 'Combos')).toMatchObject({
      to: '/combos',
      section: '/combos',
      counter: null,
    })
  })

  it('activa "Combos" solo en su sección', () => {
    expect(isSectionActive('/combos', '/combos')).toBe(true)
    expect(isSectionActive('/combos', '/lineas')).toBe(false)
  })
})
