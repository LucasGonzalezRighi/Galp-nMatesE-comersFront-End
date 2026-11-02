import { describe, expect, it } from 'vitest'
import { hasOrderFilters, ordersSearchSchema, toAdminOrderQuery } from './orders-search'

describe('ordersSearchSchema', () => {
  it('acepta cada estado, "para-despachar", el pago y la página', () => {
    expect(
      ordersSearchSchema.parse({ estado: 'para-despachar', pago: 'approved', pagina: 2 }),
    ).toEqual({ estado: 'para-despachar', pago: 'approved', pagina: 2 })
    expect(ordersSearchSchema.parse({ estado: 'shipped' })).toEqual({ estado: 'shipped' })
  })

  it('descarta los valores que no sirven en lugar de fallar', () => {
    expect(ordersSearchSchema.parse({ estado: 'otro', pago: 3, pagina: 0, q: 'lucia' })).toEqual({
      estado: undefined,
      pago: undefined,
      pagina: undefined,
    })
    expect(ordersSearchSchema.parse({ pagina: 1.5 })).toEqual({ pagina: undefined })
  })
})

describe('toAdminOrderQuery', () => {
  it('"para-despachar" pide los pedidos pagados y en preparación', () => {
    expect(toAdminOrderQuery({ estado: 'para-despachar' }, '')).toEqual({
      status: ['paid', 'preparing'],
    })
  })

  it('arma el estado, el pago, la página y el texto recortado', () => {
    expect(toAdminOrderQuery({ estado: 'paid', pago: 'approved', pagina: 3 }, '  lucía ')).toEqual({
      status: ['paid'],
      paymentStatus: 'approved',
      page: 3,
      q: 'lucía',
    })
  })

  it('sin filtros pide la primera página de todos', () => {
    expect(toAdminOrderQuery({ pagina: 1 }, '   ')).toEqual({})
  })

  it('lanza RangeError con una página que no es un entero positivo o un texto de más de 100', () => {
    expect(() => toAdminOrderQuery({ pagina: 0 }, '')).toThrow(RangeError)
    expect(() => toAdminOrderQuery({}, 'a'.repeat(101))).toThrow(RangeError)
  })
})

describe('hasOrderFilters', () => {
  it('cuenta el estado, el pago y el texto, pero no la página', () => {
    expect(hasOrderFilters({}, '')).toBe(false)
    expect(hasOrderFilters({ pagina: 2 }, '  ')).toBe(false)
    expect(hasOrderFilters({ estado: 'paid' }, '')).toBe(true)
    expect(hasOrderFilters({ pago: 'pending' }, '')).toBe(true)
    expect(hasOrderFilters({}, 'GLP')).toBe(true)
  })
})
