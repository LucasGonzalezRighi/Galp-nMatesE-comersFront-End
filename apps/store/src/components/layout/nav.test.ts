import { describe, expect, it } from 'vitest'
import { activeNavKey, NAV_ITEMS } from './nav'

describe('NAV_ITEMS', () => {
  it('son los seis links del spec, en orden, con "Preguntas frecuentes" en el menú del celular', () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      'Inicio',
      'Tienda',
      'Armá tu kit',
      'Nosotros',
      'Preguntas',
      'Contacto',
    ])
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      '/',
      '/tienda',
      '/kit',
      '/nosotros',
      '/preguntas-frecuentes',
      '/contacto',
    ])
    expect(NAV_ITEMS.find((item) => item.key === 'faq')?.menuLabel).toBe('Preguntas frecuentes')
  })
})

describe('activeNavKey', () => {
  it.each([
    ['/', 'inicio'],
    ['/tienda', 'tienda'],
    ['/tienda/bombillones', 'tienda'],
    ['/producto/mate-imperial-premium', 'tienda'],
    ['/kit', 'kit'],
    ['/nosotros', 'nosotros'],
    ['/preguntas-frecuentes', 'faq'],
    ['/contacto', 'contacto'],
  ])('%s marca %s', (pathname, key) => {
    expect(activeNavKey(pathname)).toBe(key)
  })

  it.each([
    ['/checkout'],
    ['/arrepentimiento'],
    ['/cuenta/pedidos'],
    ['/constructor'],
    ['/toString'],
  ])('%s no marca ningún link', (pathname) => {
    expect(activeNavKey(pathname)).toBeNull()
  })

  it('"/tienda-vieja" no es "Tienda": compara el segmento entero', () => {
    expect(activeNavKey('/tienda-vieja')).toBeNull()
    expect(activeNavKey('/productos')).toBeNull()
  })
})
