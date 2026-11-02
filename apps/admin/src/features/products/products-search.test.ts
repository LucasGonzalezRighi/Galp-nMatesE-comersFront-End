import { describe, expect, it } from 'vitest'
import {
  hasProductFilters,
  orderOfSorting,
  productsSearchSchema,
  sortingOfOrder,
  toAdminProductQuery,
} from './products-search'

describe('productsSearchSchema', () => {
  it('acepta el texto, la línea, el estado, sin stock, el orden y la página', () => {
    expect(
      productsSearchSchema.parse({
        q: 'mate',
        linea: 'torpedos',
        estado: 'archived',
        sinStock: 1,
        orden: 'menor',
        pagina: 2,
      }),
    ).toEqual({
      q: 'mate',
      linea: 'torpedos',
      estado: 'archived',
      sinStock: 1,
      orden: 'menor',
      pagina: 2,
    })
  })

  it('descarta lo que no sirve en lugar de fallar', () => {
    expect(
      productsSearchSchema.parse({
        q: '   ',
        linea: 'No Es Slug',
        estado: 'otro',
        sinStock: 2,
        orden: 'destacados',
        pagina: 0,
      }),
    ).toEqual({
      q: undefined,
      linea: undefined,
      estado: undefined,
      sinStock: undefined,
      orden: undefined,
      pagina: undefined,
    })
  })

  it('un texto que parece número (?q=7) sigue siendo texto', () => {
    expect(productsSearchSchema.parse({ q: 7 }).q).toBe('7')
  })
})

describe('toAdminProductQuery', () => {
  it('traduce cada filtro al parámetro de la API, de a 24', () => {
    expect(
      toAdminProductQuery({
        q: 'n°07',
        linea: 'torpedos',
        estado: 'draft',
        sinStock: 1,
        orden: 'az',
        pagina: 3,
      }),
    ).toEqual({
      q: 'n°07',
      category: 'torpedos',
      status: 'draft',
      stock: 'out',
      sort: 'az',
      page: 3,
      pageSize: 24,
    })
  })

  it('sin filtros pide la primera página (publicados y borradores)', () => {
    expect(toAdminProductQuery({ pagina: 1 })).toEqual({ pageSize: 24 })
  })

  it('rechaza una página imposible', () => {
    expect(() => toAdminProductQuery({ pagina: 0 })).toThrow(RangeError)
  })
})

describe('hasProductFilters', () => {
  it('el orden y la página no cuentan como filtros', () => {
    expect(hasProductFilters({ orden: 'mayor', pagina: 2 })).toBe(false)
    expect(hasProductFilters({ q: 'mate' })).toBe(true)
    expect(hasProductFilters({ linea: 'yerbas' })).toBe(true)
    expect(hasProductFilters({ estado: 'archived' })).toBe(true)
    expect(hasProductFilters({ sinStock: 1 })).toBe(true)
  })
})

describe('orden de la tabla', () => {
  it('cada orden marca su columna', () => {
    expect(sortingOfOrder('az')).toEqual({ columnId: 'name', direction: 'asc' })
    expect(sortingOfOrder('menor')).toEqual({ columnId: 'price', direction: 'asc' })
    expect(sortingOfOrder('mayor')).toEqual({ columnId: 'price', direction: 'desc' })
    expect(sortingOfOrder(undefined)).toBeNull()
  })

  it('tocar un encabezado da el orden de la URL; el nombre al revés vuelve al de código', () => {
    expect(orderOfSorting('name', 'asc')).toBe('az')
    expect(orderOfSorting('name', 'desc')).toBeUndefined()
    expect(orderOfSorting('price', 'asc')).toBe('menor')
    expect(orderOfSorting('price', 'desc')).toBe('mayor')
  })

  it('rechaza una columna que no se ordena', () => {
    expect(() => orderOfSorting('stock', 'asc')).toThrow(RangeError)
  })
})
