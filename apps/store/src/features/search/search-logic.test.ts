import { describe, expect, it } from 'vitest'
import type { SearchableProduct } from './search-logic'
import {
  enterHref,
  lineHref,
  matchProducts,
  MAX_SEARCH_RESULTS,
  productHref,
  shopSearchHref,
} from './search-logic'

/** Producto de prueba con lo que usa el buscador. */
function product(
  slug: string,
  name: string,
  categoryName = 'Mates',
  description = '',
): SearchableProduct {
  return { slug, name, description, categoryName }
}

const CATALOG = [
  product('bombillon-curvo', 'Bombillón Curvo', 'Bombillones'),
  product('yerba-te-jengibre', 'Yerba Canarias Té y Jengibre 1 kg', 'Yerbas'),
  product(
    'mate-imperial-premium',
    'Mate Imperial Premium',
    'Imperiales',
    'Calabaza forrada en cuero',
  ),
  product('mate-torpedo', 'Mate Torpedo', 'Torpedos'),
]

describe('matchProducts', () => {
  it('encuentra sin importar acentos ni mayúsculas (Review Focus 2 del spec)', () => {
    expect(matchProducts(CATALOG, 'bombillon').map((p) => p.name)).toEqual(['Bombillón Curvo'])
    expect(matchProducts(CATALOG, 'BOMBILLÓN').map((p) => p.name)).toEqual(['Bombillón Curvo'])
    expect(matchProducts(CATALOG, 'te y jengibre')).toHaveLength(1)
  })

  it('busca también en la descripción y en la línea', () => {
    expect(matchProducts(CATALOG, 'calabaza').map((p) => p.name)).toEqual(['Mate Imperial Premium'])
    expect(matchProducts(CATALOG, 'torpedos').map((p) => p.name)).toEqual(['Mate Torpedo'])
  })

  it('respeta el orden del catálogo', () => {
    expect(matchProducts(CATALOG, 'mate').map((p) => p.name)).toEqual([
      'Mate Imperial Premium',
      'Mate Torpedo',
    ])
  })

  it('una búsqueda vacía o de solo espacios no encuentra nada', () => {
    expect(matchProducts(CATALOG, '')).toEqual([])
    expect(matchProducts(CATALOG, '   ')).toEqual([])
  })

  it('un texto que no está en ningún producto no encuentra nada', () => {
    expect(matchProducts(CATALOG, 'termo')).toEqual([])
  })
})

describe('shopSearchHref', () => {
  it('lleva a /tienda?q= con el texto codificado', () => {
    expect(shopSearchHref('mate torpedo')).toBe('/tienda?q=mate%20torpedo')
    expect(shopSearchHref('té & café?')).toBe('/tienda?q=t%C3%A9%20%26%20caf%C3%A9%3F')
  })

  it('codifica un script y un emoji como texto (Review Focus 5)', () => {
    expect(shopSearchHref('<script>alert(1)</script>')).toBe(
      '/tienda?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
    )
    expect(shopSearchHref('mate 🧉')).toBe('/tienda?q=mate%20%F0%9F%A7%89')
  })

  it('recorta los espacios de los bordes', () => {
    expect(shopSearchHref('  mate  ')).toBe('/tienda?q=mate')
  })

  it('sin texto lleva a /tienda', () => {
    expect(shopSearchHref('')).toBe('/tienda')
    expect(shopSearchHref('   ')).toBe('/tienda')
  })
})

describe('productHref y lineHref', () => {
  it('arman las rutas con el slug codificado', () => {
    expect(productHref('mate-imperial-premium')).toBe('/producto/mate-imperial-premium')
    expect(lineHref('torpedos')).toBe('/tienda/torpedos')
    expect(productHref('../raro')).toBe('/producto/..%2Fraro')
  })
})

describe('enterHref (Review Focus 5)', () => {
  it('con un solo resultado va a la ficha del producto', () => {
    const matches = matchProducts(CATALOG, 'bombillon')
    expect(enterHref(matches, 'bombillon')).toBe('/producto/bombillon-curvo')
  })

  it('sin resultados va a la tienda con la búsqueda', () => {
    expect(enterHref([], 'termo')).toBe('/tienda?q=termo')
  })

  it('con varios resultados va a la tienda con la búsqueda', () => {
    const matches = matchProducts(CATALOG, 'mate')
    expect(matches.length).toBeGreaterThan(1)
    expect(enterHref(matches, 'mate')).toBe('/tienda?q=mate')
  })

  it('con la búsqueda vacía va a /tienda', () => {
    expect(enterHref([], '')).toBe('/tienda')
  })
})

describe('MAX_SEARCH_RESULTS', () => {
  it('son 6 (spec 9.5)', () => {
    expect(MAX_SEARCH_RESULTS).toBe(6)
  })
})
