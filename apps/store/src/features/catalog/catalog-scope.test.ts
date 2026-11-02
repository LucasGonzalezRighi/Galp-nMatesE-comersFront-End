import { describe, expect, it } from 'vitest'
import type { Category, ProductSummary } from '@galpon/api-client'
import {
  buildCatalogScope,
  CATALOG_PLACEHOLDER_LINE,
  catalogHref,
  catalogLineParams,
} from './catalog-scope'

/** Línea de producto para las pruebas. */
function category(slug: string, name: string, position: number): Category {
  return {
    id: `cat-${slug}`,
    slug,
    name,
    blurb: `Bajada de ${name}.`,
    group: 'mate',
    image: null,
    position,
    productCount: 99,
  }
}

/** Producto de una línea para las pruebas. */
function product(id: string, categorySlug: string): ProductSummary {
  return {
    id,
    categoryId: `cat-${categorySlug}`,
    categoryName: categorySlug,
    categorySlug,
    code: 'N°01',
    description: '',
    featured: false,
    group: 'mate',
    isPurchasable: true,
    isSoldOut: false,
    mainImage: null,
    maxQuantity: 10,
    name: id,
    netPriceArs: 8264,
    priceArs: 10000,
    rating: { average: 0, count: 0 },
    slug: id,
  }
}

const categories = [
  category('imperiales', 'Imperiales', 1),
  category('torpedos', 'Torpedos', 2),
  category('yerbas', 'Yerbas', 3),
]
const products = [
  product('a', 'imperiales'),
  product('b', 'torpedos'),
  product('c', 'imperiales'),
  product('d', 'torpedos'),
  product('e', 'torpedos'),
]

describe('buildCatalogScope', () => {
  it('sin línea trae todo el catálogo, con la cantidad de cada línea contada de los productos', () => {
    const scope = buildCatalogScope(categories, products, null)
    expect(scope?.line).toBeNull()
    expect(scope?.products).toHaveLength(5)
    expect(scope?.totalCount).toBe(5)
    expect(scope?.lines).toEqual([
      { slug: 'imperiales', name: 'Imperiales', count: 2 },
      { slug: 'torpedos', name: 'Torpedos', count: 3 },
      { slug: 'yerbas', name: 'Yerbas', count: 0 },
    ])
  })

  it('con una línea deja solo sus productos y trae su título y bajada', () => {
    const scope = buildCatalogScope(categories, products, 'torpedos')
    expect(scope?.line).toEqual({
      slug: 'torpedos',
      name: 'Torpedos',
      blurb: 'Bajada de Torpedos.',
    })
    expect(scope?.products.map((item) => item.slug)).toEqual(['b', 'd', 'e'])
    expect(scope?.totalCount).toBe(5)
  })

  it('una línea sin productos existe y queda vacía', () => {
    const scope = buildCatalogScope(categories, products, 'yerbas')
    expect(scope?.line?.name).toBe('Yerbas')
    expect(scope?.products).toEqual([])
  })

  it('una línea inexistente devuelve null (la página responde notFound)', () => {
    expect(buildCatalogScope(categories, products, 'no-existe')).toBeNull()
    expect(buildCatalogScope(categories, products, CATALOG_PLACEHOLDER_LINE)).toBeNull()
  })

  it('un slug raro (mayúsculas, "..", "%") tampoco rompe: devuelve null', () => {
    for (const slug of ['Imperiales', '..', '%', '%E0%A4%A', '', 'a/b']) {
      expect(buildCatalogScope(categories, products, slug)).toBeNull()
    }
  })
})

describe('catalogLineParams', () => {
  it('devuelve un parámetro por línea', () => {
    expect(catalogLineParams(categories)).toEqual([
      { linea: 'imperiales' },
      { linea: 'torpedos' },
      { linea: 'yerbas' },
    ])
  })

  it('si no hay líneas devuelve uno de relleno, que no es una línea real', () => {
    const params = catalogLineParams([])
    expect(params).toEqual([{ linea: CATALOG_PLACEHOLDER_LINE }])
    expect(buildCatalogScope(categories, products, CATALOG_PLACEHOLDER_LINE)).toBeNull()
  })
})

describe('catalogHref', () => {
  it('lleva a la tienda o a una línea, conservando la búsqueda y el orden', () => {
    expect(catalogHref(null, { query: '', order: 'destacados' })).toBe('/tienda')
    expect(catalogHref('torpedos', { query: '', order: 'destacados' })).toBe('/tienda/torpedos')
    expect(catalogHref('torpedos', { query: 'té', order: 'az' })).toBe(
      '/tienda/torpedos?q=t%C3%A9&orden=az',
    )
  })
})
