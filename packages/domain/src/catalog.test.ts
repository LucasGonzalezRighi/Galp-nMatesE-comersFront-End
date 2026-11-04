import { describe, expect, it } from 'vitest'
import type { ProductGroup, ProductSortOrder, ProductStatus } from './catalog'
import type { Pesos } from './money'
import {
  MAX_QUANTITY_PER_PRODUCT,
  PRODUCT_GROUPS,
  PRODUCT_SORT_ORDERS,
  PRODUCT_STATUSES,
  RELATED_PRODUCTS_LIMIT,
  assertValidQuantity,
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
    expect(RELATED_PRODUCTS_LIMIT).toBe(30)
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
  it('concuerda con maxQuantity: un stock fraccionario menor a 1 o no finito no es comprable', () => {
    expect(isPurchasable({ ...buyable, stock: 0.5 })).toBe(false)
    expect(isPurchasable({ ...buyable, stock: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isPurchasable({ ...buyable, stock: Number.NaN })).toBe(false)
    expect(isPurchasable({ ...buyable, stock: -3 })).toBe(false)
    expect(isPurchasable({ ...buyable, stock: 1.5 })).toBe(true)
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
  it('da 0 si el stock no es un número finito', () => {
    expect(maxQuantity(Number.NaN)).toBe(0)
    expect(maxQuantity(Number.POSITIVE_INFINITY)).toBe(0)
    expect(maxQuantity(Number.NEGATIVE_INFINITY)).toBe(0)
  })
  it('redondea hacia abajo un stock fraccionario: no se vende media unidad', () => {
    expect(maxQuantity(2.5)).toBe(2)
    expect(maxQuantity(0.9)).toBe(0)
    expect(maxQuantity(20.5)).toBe(20)
  })
})

describe('assertValidQuantity', () => {
  it('acepta cualquier entero desde 1: el tope de compra lo aplica quien arma el carrito', () => {
    expect(() => {
      assertValidQuantity(1)
      assertValidQuantity(MAX_QUANTITY_PER_PRODUCT + 1)
    }).not.toThrow()
  })
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rechaza %s', (quantity) => {
    expect(() => {
      assertValidQuantity(quantity)
    }).toThrow(new RangeError('La cantidad tiene que ser un entero mayor o igual a 1'))
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
  it('acepta el primer correlativo', () => {
    expect(formatProductCode(1)).toBe('N°01')
  })
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza %s, que no es un entero mayor o igual a 1',
    (sequence) => {
      expect(() => formatProductCode(sequence)).toThrow(RangeError)
    },
  )
  it('el mensaje de error está en español y dice qué se recibió', () => {
    expect(() => formatProductCode(0)).toThrow(/entero mayor o igual a 1.*0/)
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
  it('lanza un error claro con un orden desconocido (por ejemplo, un ?orden= sin validar)', () => {
    expect(() => sortProducts(catalog, 'za' as ProductSortOrder)).toThrow(
      /Orden del catálogo desconocido: "za"/,
    )
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

  it('pone la misma línea, el mismo grupo en otras líneas y el resto por grupo (mate, bombilla, yerba)', () => {
    expect(ids(selectRelated(m1, catalog))).toEqual(['m3', 'm5', 'm2', 'm4', 'm6', 'b1', 'y1'])
  })
  it('en una bombilla, el resto va con los mates antes que las yerbas', () => {
    const bombilla = item('b2', 'curvo', 'bombilla')
    expect(ids(selectRelated(bombilla, [...catalog, bombilla]))).toEqual([
      'b1',
      'm1',
      'm2',
      'm3',
      'm4',
      'm5',
      'm6',
      'y1',
    ])
  })
  it('respeta el límite indicado', () => {
    expect(ids(selectRelated(m1, catalog, 2))).toEqual(['m3', 'm5'])
    expect(ids(selectRelated(m1, catalog, 6))).toEqual(['m3', 'm5', 'm2', 'm4', 'm6', 'b1'])
  })
  it('devuelve hasta 30 por defecto y nunca el propio producto', () => {
    const many = [m1, ...Array.from({ length: 40 }, (_, i) => item(`x${String(i)}`, 'otra'))]
    const related = selectRelated(m1, many)
    expect(related).toHaveLength(RELATED_PRODUCTS_LIMIT)
    expect(ids(related)).not.toContain('m1')
  })
  it('con el catálogo de prueba, un mate imperial trae 26 y arriba quedan los de antes', () => {
    const lines: [string, ProductGroup, number][] = [
      ['imperiales', 'mate', 4],
      ['torpedos', 'mate', 6],
      ['camioneros', 'mate', 3],
      ['ranchero', 'mate', 3],
      ['yerbas', 'yerba', 3],
      ['bombillones', 'bombilla', 8],
    ]
    const fixture = lines.flatMap(([line, group, count]) =>
      Array.from({ length: count }, (_, i) => item(`${line}-${String(i)}`, line, group)),
    )
    const [premium] = fixture
    if (premium === undefined) throw new Error('falta el primer imperial')
    const related = selectRelated(premium, fixture)
    expect(related).toHaveLength(26)
    expect(ids(related.slice(0, 4))).toEqual([
      'imperiales-1',
      'imperiales-2',
      'imperiales-3',
      'torpedos-0',
    ])
    expect(related.slice(0, 15).every((r) => r.group === 'mate')).toBe(true)
    expect(related.slice(15, 23).every((r) => r.group === 'bombilla')).toBe(true)
    expect(related.slice(23).every((r) => r.group === 'yerba')).toBe(true)
  })
  it('un límite negativo o 0 no devuelve ninguno', () => {
    expect(selectRelated(m1, catalog, -1)).toEqual([])
    expect(selectRelated(m1, catalog, 0)).toEqual([])
  })
  it('un límite fraccionario se redondea hacia abajo', () => {
    expect(ids(selectRelated(m1, catalog, 2.9))).toEqual(['m3', 'm5'])
    expect(selectRelated(m1, catalog, -0.5)).toEqual([])
  })
  it('un límite que no es un número no devuelve ninguno', () => {
    expect(selectRelated(m1, catalog, Number.NaN)).toEqual([])
  })
  it('devuelve los que hay si hay menos que el límite', () => {
    expect(ids(selectRelated(m1, [m1, item('m3', 'imperial')]))).toEqual(['m3'])
  })
  it('si el producto está solo en su grupo, trae los de los otros grupos', () => {
    expect(ids(selectRelated(m1, [m1, item('y1', 'clasica', 'yerba')]))).toEqual(['y1'])
  })
  it('devuelve una lista vacía si el producto está solo en el catálogo', () => {
    expect(selectRelated(m1, [m1])).toEqual([])
  })
})
