import { describe, expect, it } from 'vitest'
import type { ProductSummary } from '@galpon/api-client'
import {
  catalogCountLabel,
  catalogSearch,
  DEFAULT_CATALOG_ORDER,
  filterCatalog,
  readCatalogParams,
} from './catalog-query'

/** Producto del catálogo para las pruebas: un mate de $10.000, salvo lo que se cambie. */
function product(overrides: Partial<ProductSummary> & { id: string }): ProductSummary {
  return {
    categoryId: 'cat-imperiales',
    categoryName: 'Imperiales',
    categorySlug: 'imperiales',
    code: 'N°01',
    description: 'Descripción.',
    featured: false,
    group: 'mate',
    isPurchasable: true,
    isSoldOut: false,
    mainImage: null,
    maxQuantity: 10,
    name: `Producto ${overrides.id}`,
    netPriceArs: 8264,
    priceArs: 10000,
    rating: { average: 0, count: 0 },
    slug: overrides.id,
    ...overrides,
  }
}

const catalog: ProductSummary[] = [
  product({ id: 'a', name: 'Mate Imperial', priceArs: 40000, featured: true }),
  product({ id: 'b', name: 'Bombillón Curvo', categoryName: 'Bombillones', priceArs: 26000 }),
  product({ id: 'c', name: 'Yerba Té y Jengibre', categoryName: 'Yerbas', priceArs: 12500 }),
  product({
    id: 'd',
    name: 'Bombillón de Alpaca',
    categoryName: 'Bombillones',
    description: 'Pico loro, con filtro.',
    priceArs: 29000,
    featured: true,
  }),
  product({ id: 'e', name: 'Mate Torpedo Línea Acero', priceArs: null }),
]

/** Los ids en el orden en que quedan. */
function ids(products: readonly ProductSummary[]): string[] {
  return products.map((item) => item.id)
}

describe('readCatalogParams', () => {
  it('toma la búsqueda y el orden de la dirección', () => {
    expect(readCatalogParams('mate', 'menor')).toEqual({ query: 'mate', order: 'menor' })
  })

  it('sin parámetros devuelve búsqueda vacía y destacados', () => {
    expect(readCatalogParams(null, null)).toEqual({ query: '', order: DEFAULT_CATALOG_ORDER })
  })

  it('un orden desconocido cae en destacados en lugar de romper', () => {
    expect(readCatalogParams('', 'baratos').order).toBe('destacados')
    expect(readCatalogParams('', '').order).toBe('destacados')
  })

  it('deja el texto como llegó, aunque tenga etiquetas o emojis', () => {
    expect(readCatalogParams('<script>alert(1)</script> \u{1F9C9}', null).query).toBe(
      '<script>alert(1)</script> \u{1F9C9}',
    )
  })
})

describe('catalogSearch', () => {
  it('es vacía con la búsqueda vacía y el orden por omisión', () => {
    expect(catalogSearch({ query: '', order: 'destacados' })).toBe('')
    expect(catalogSearch({ query: '   ', order: 'destacados' })).toBe('')
  })

  it('arma ?q=&orden= y solo incluye lo que no es el valor por omisión', () => {
    expect(catalogSearch({ query: 'mate', order: 'destacados' })).toBe('?q=mate')
    expect(catalogSearch({ query: '', order: 'az' })).toBe('?orden=az')
    expect(catalogSearch({ query: 'mate', order: 'mayor' })).toBe('?q=mate&orden=mayor')
  })

  it('recorta la búsqueda y codifica el texto raro', () => {
    expect(catalogSearch({ query: '  té y jengibre ', order: 'destacados' })).toBe(
      '?q=t%C3%A9+y+jengibre',
    )
    expect(catalogSearch({ query: '<b>&</b>', order: 'destacados' })).toBe(
      '?q=%3Cb%3E%26%3C%2Fb%3E',
    )
  })

  it('lo que escribe se lee de vuelta igual (ida y vuelta)', () => {
    const search = catalogSearch({ query: '<script>\u{1F9C9} & más', order: 'az' })
    const params = new URLSearchParams(search)
    expect(readCatalogParams(params.get('q'), params.get('orden'))).toEqual({
      query: '<script>\u{1F9C9} & más',
      order: 'az',
    })
  })
})

describe('filterCatalog', () => {
  it('sin búsqueda devuelve todo, con los destacados primero', () => {
    expect(ids(filterCatalog(catalog, { query: '', order: 'destacados' }))).toEqual([
      'a',
      'd',
      'b',
      'c',
      'e',
    ])
  })

  it('busca sin importar acentos ni mayúsculas, en nombre, descripción y línea', () => {
    expect(ids(filterCatalog(catalog, { query: 'BOMBILLON', order: 'az' }))).toEqual(['b', 'd'])
    expect(ids(filterCatalog(catalog, { query: 'te y jengibre', order: 'az' }))).toEqual(['c'])
    expect(ids(filterCatalog(catalog, { query: 'pico loro', order: 'az' }))).toEqual(['d'])
    expect(ids(filterCatalog(catalog, { query: 'yerbas', order: 'az' }))).toEqual(['c'])
  })

  it('combina filtro y orden: menor y mayor precio, y los sin precio quedan al final', () => {
    expect(ids(filterCatalog(catalog, { query: 'bombillon', order: 'menor' }))).toEqual(['b', 'd'])
    expect(ids(filterCatalog(catalog, { query: 'bombillon', order: 'mayor' }))).toEqual(['d', 'b'])
    expect(ids(filterCatalog(catalog, { query: 'mate', order: 'menor' }))).toEqual(['a', 'e'])
    expect(ids(filterCatalog(catalog, { query: 'mate', order: 'mayor' }))).toEqual(['a', 'e'])
  })

  it('ordena de la A a la Z según el español', () => {
    expect(ids(filterCatalog(catalog, { query: '', order: 'az' }))).toEqual([
      'b',
      'd',
      'a',
      'e',
      'c',
    ])
  })

  it('sin coincidencias devuelve una lista vacía y no toca la original', () => {
    const before = ids(catalog)
    expect(filterCatalog(catalog, { query: 'zzz', order: 'menor' })).toEqual([])
    expect(ids(catalog)).toEqual(before)
  })

  it('una búsqueda con etiquetas se trata como texto: no encuentra nada', () => {
    expect(filterCatalog(catalog, { query: '<script>alert(1)</script>', order: 'az' })).toEqual([])
  })

  it('con un orden inválido lanza RangeError en español', () => {
    expect(() =>
      filterCatalog(catalog, { query: '', order: 'baratos' as unknown as 'az' }),
    ).toThrow(new RangeError('El orden del catálogo no es válido: "baratos".'))
  })
})

describe('catalogCountLabel', () => {
  it('pluraliza', () => {
    expect(catalogCountLabel(0)).toBe('0 piezas')
    expect(catalogCountLabel(1)).toBe('1 pieza')
    expect(catalogCountLabel(27)).toBe('27 piezas')
  })

  it('agrupa los miles al estilo argentino', () => {
    expect(catalogCountLabel(1234)).toBe('1.234 piezas')
  })

  it('rechaza cantidades que no son enteros no negativos', () => {
    expect(() => catalogCountLabel(-1)).toThrow(RangeError)
    expect(() => catalogCountLabel(1.5)).toThrow(RangeError)
  })
})
