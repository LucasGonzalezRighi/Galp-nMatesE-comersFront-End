import { describe, expect, it } from 'vitest'
import type { ProductGroup, ProductStatus } from './catalog'
import type { Pesos } from './money'
import {
  MAX_QUANTITY_PER_PRODUCT,
  PRODUCT_GROUPS,
  PRODUCT_SORT_ORDERS,
  PRODUCT_STATUSES,
  formatProductCode,
  isProductSortOrder,
  isPurchasable,
  maxQuantity,
  selectRelated,
  sortProducts,
} from './catalog'
import { pesos } from './money'

describe('constantes del catálogo', () => {
  it('define los grupos, los estados y los órdenes con los valores exactos', () => {
    expect(PRODUCT_GROUPS).toEqual(['mate', 'bombilla', 'yerba'])
    expect(PRODUCT_STATUSES).toEqual(['draft', 'published', 'archived'])
    expect(PRODUCT_SORT_ORDERS).toEqual(['destacados', 'menor', 'mayor', 'az'])
    expect(MAX_QUANTITY_PER_PRODUCT).toBe(20)
  })
})

describe('isPurchasable', () => {
  const buyable = { status: 'published', priceArs: pesos(39999), stock: 5 } as const
  it('es comprable si está publicado, tiene precio y hay stock', () => {
    expect(isPurchasable(buyable)).toBe(true)
  })
  it('no es comprable sin precio ("a consultar")', () => {
    expect(isPurchasable({ ...buyable, priceArs: null })).toBe(false)
  })
  it('no es comprable sin stock', () => {
    expect(isPurchasable({ ...buyable, stock: 0 })).toBe(false)
  })
  it.each<ProductStatus>(['draft', 'archived'])(
    'no es comprable si está en estado %s',
    (status) => {
      expect(isPurchasable({ ...buyable, status })).toBe(false)
    },
  )
})

describe('maxQuantity', () => {
  it('limita a 20 unidades por producto', () => {
    expect(maxQuantity(50)).toBe(20)
    expect(maxQuantity(20)).toBe(20)
  })
  it('usa el stock cuando es menor al límite', () => {
    expect(maxQuantity(3)).toBe(3)
  })
  it('no es negativa si no hay stock', () => {
    expect(maxQuantity(0)).toBe(0)
    expect(maxQuantity(-2)).toBe(0)
  })
})

describe('formatProductCode', () => {
  it('completa con cero hasta dos dígitos', () => {
    expect(formatProductCode(7)).toBe('N°07')
  })
  it('no recorta los códigos de dos o más dígitos', () => {
    expect(formatProductCode(27)).toBe('N°27')
    expect(formatProductCode(100)).toBe('N°100')
  })
})

describe('isProductSortOrder', () => {
  it('reconoce los órdenes válidos y rechaza el resto', () => {
    expect(isProductSortOrder('mayor')).toBe(true)
    expect(isProductSortOrder('az')).toBe(true)
    expect(isProductSortOrder('za')).toBe(false)
    expect(isProductSortOrder('')).toBe(false)
  })
})

describe('sortProducts', () => {
  interface Item {
    name: string
    priceArs: Pesos | null
    featured: boolean
  }
  const item = (name: string, price: number | null, featured = false): Item => ({
    name,
    priceArs: price === null ? null : pesos(price),
    featured,
  })
  const names = (items: readonly Item[]) => items.map((i) => i.name)

  const catalog = [
    item('C', 300),
    item('Sin precio', null),
    item('A', 100),
    item('D', 200),
    item('Otro sin precio', null),
  ]

  it('"menor" ordena de menor a mayor precio, con los "a consultar" al final', () => {
    expect(names(sortProducts(catalog, 'menor'))).toEqual([
      'A',
      'D',
      'C',
      'Sin precio',
      'Otro sin precio',
    ])
  })
  it('"mayor" ordena de mayor a menor precio, con los "a consultar" al final', () => {
    expect(names(sortProducts(catalog, 'mayor'))).toEqual([
      'C',
      'D',
      'A',
      'Sin precio',
      'Otro sin precio',
    ])
  })
  it('"az" ordena por nombre según el español: Ángel va antes que Azul', () => {
    const items = [item('Azul', 1), item('Zeta', 1), item('Ángel', 1), item('Bombilla', 1)]
    expect(names(sortProducts(items, 'az'))).toEqual(['Ángel', 'Azul', 'Bombilla', 'Zeta'])
  })
  it('"destacados" pone primero los destacados y respeta el orden de entrada dentro de cada grupo', () => {
    const items = [
      item('a', 1),
      item('b', 1, true),
      item('c', 1),
      item('d', 1, true),
      item('e', 1, true),
      item('f', 1),
    ]
    expect(names(sortProducts(items, 'destacados'))).toEqual(['b', 'd', 'e', 'a', 'c', 'f'])
  })
  it('es estable cuando los precios empatan', () => {
    const items = [item('x', 5), item('y', 5), item('z', 5)]
    expect(names(sortProducts(items, 'menor'))).toEqual(['x', 'y', 'z'])
    expect(names(sortProducts(items, 'mayor'))).toEqual(['x', 'y', 'z'])
  })
  it('no modifica el arreglo de entrada y devuelve uno nuevo', () => {
    const input = [item('C', 300), item('A', 100)]
    const snapshot = [...input]
    const sorted = sortProducts(input, 'menor')
    expect(input).toEqual(snapshot)
    expect(sorted).not.toBe(input)
  })
})

describe('selectRelated', () => {
  interface Item {
    id: string
    categoryId: string
    group: ProductGroup
  }
  const item = (id: string, categoryId: string, group: ProductGroup = 'mate'): Item => ({
    id,
    categoryId,
    group,
  })
  const ids = (items: readonly Item[]) => items.map((i) => i.id)

  const m1 = item('m1', 'imperial')
  const catalog = [
    m1,
    item('m2', 'camionero'),
    item('m3', 'imperial'),
    item('b1', 'curvo', 'bombilla'),
    item('m4', 'camionero'),
    item('m5', 'imperial'),
    item('y1', 'clasica', 'yerba'),
    item('m6', 'torpedo'),
  ]

  it('pone primero la misma línea (sin el propio producto) y después el mismo grupo en otras líneas', () => {
    expect(ids(selectRelated(m1, catalog))).toEqual(['m3', 'm5', 'm2', 'm4'])
  })
  it('devuelve hasta 4 por defecto', () => {
    expect(selectRelated(m1, catalog)).toHaveLength(4)
  })
  it('respeta el límite indicado', () => {
    expect(ids(selectRelated(m1, catalog, 2))).toEqual(['m3', 'm5'])
    expect(ids(selectRelated(m1, catalog, 6))).toEqual(['m3', 'm5', 'm2', 'm4', 'm6'])
  })
  it('nunca incluye productos de otro grupo', () => {
    const bombilla = item('b2', 'curvo', 'bombilla')
    const related = selectRelated(bombilla, [...catalog, bombilla])
    expect(ids(related)).toEqual(['b1'])
    expect(related.every((r) => r.group === 'bombilla')).toBe(true)
  })
  it('devuelve los que hay si hay menos que el límite', () => {
    expect(ids(selectRelated(m1, [m1, item('m3', 'imperial')]))).toEqual(['m3'])
  })
  it('devuelve una lista vacía si el producto está solo en su grupo', () => {
    expect(selectRelated(m1, [m1, item('y1', 'clasica', 'yerba')])).toEqual([])
  })
})
