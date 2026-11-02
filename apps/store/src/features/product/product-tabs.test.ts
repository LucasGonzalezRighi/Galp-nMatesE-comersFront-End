import { describe, expect, it } from 'vitest'
import type { ProductTabsContent } from '@galpon/api-client'
import { buildProductTabs } from './product-tabs'
import { detail } from './test/support'

const content: ProductTabsContent = {
  mate: {
    careTitle: 'Cuidado',
    materialsTitle: 'Materiales',
    materials: 'Calabaza, cuero y alpaca.',
    care: 'Curalo antes de usarlo.',
    descriptionNote: 'Cada pieza es artesanal.',
  },
  bombilla: {
    careTitle: 'Cuidado',
    materialsTitle: 'Materiales',
    materials: 'Acero inoxidable.',
    care: 'Lavala con agua tibia.',
    descriptionNote: null,
  },
  yerba: {
    careTitle: 'Conservación',
    materialsTitle: 'Contenido',
    materials: 'Yerba mate con palo.',
    care: 'Guardala cerrada.',
    descriptionNote: null,
  },
  shipping: 'Envíos a todo el país.',
}

describe('buildProductTabs', () => {
  it('arma las cuatro pestañas en orden, con los textos del producto', () => {
    const tabs = buildProductTabs(detail(), content)

    expect(tabs.map((tab) => [tab.id, tab.label])).toEqual([
      ['description', 'Descripción'],
      ['materials', 'Materiales'],
      ['shipping', 'Envío y cambios'],
      ['care', 'Cuidado'],
    ])
    expect(tabs[1]?.text).toBe('Calabaza, cuero y alpaca.')
    expect(tabs[2]?.text).toBe('Envíos a todo el país.')
    expect(tabs[3]?.text).toBe('Curalo antes de usarlo.')
  })

  it('la descripción suma la nota si la hay', () => {
    const tabs = buildProductTabs(detail(), content)

    expect(tabs[0]?.text).toBe('Imperial con virola de alpaca. Cada pieza es artesanal.')
  })

  it('sin nota (o con una nota vacía) la descripción queda sola', () => {
    for (const descriptionNote of [null, '  ']) {
      const tabs = buildProductTabs(
        detail({ tabs: { ...detail().tabs, descriptionNote } }),
        content,
      )
      expect(tabs[0]?.text).toBe('Imperial con virola de alpaca.')
    }
  })

  it('en las yerbas los títulos son "Contenido" y "Conservación"', () => {
    const tabs = buildProductTabs(detail({ group: 'yerba', options: null }), content)

    expect(tabs[1]?.label).toBe('Contenido')
    expect(tabs[3]?.label).toBe('Conservación')
  })
})
