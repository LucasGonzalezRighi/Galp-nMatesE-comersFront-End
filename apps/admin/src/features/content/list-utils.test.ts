import { describe, expect, it } from 'vitest'
import { fieldIndex, findMove, listFieldErrors, repeatedIndexes } from './list-utils'

describe('fieldIndex', () => {
  it('devuelve el lugar como texto', () => {
    expect(fieldIndex(0)).toBe('0')
    expect(fieldIndex(12)).toBe('12')
  })

  it('lanza RangeError con un lugar negativo o con decimales', () => {
    expect(() => fieldIndex(-1)).toThrow(RangeError)
    expect(() => fieldIndex(1.5)).toThrow(RangeError)
  })
})

describe('findMove', () => {
  it('encuentra el movimiento hacia arriba y hacia abajo', () => {
    expect(findMove(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual({ from: 2, to: 0 })
    expect(findMove(['a', 'b', 'c'], ['b', 'a', 'c'])).toEqual({ from: 0, to: 1 })
    expect(findMove(['a', 'b', 'c'], ['b', 'c', 'a'])).toEqual({ from: 0, to: 2 })
  })

  it('devuelve null si el orden no cambió', () => {
    expect(findMove(['a', 'b'], ['a', 'b'])).toBeNull()
  })

  it('lanza RangeError con otras claves o con más de un movimiento', () => {
    expect(() => findMove(['a', 'b'], ['a', 'c'])).toThrow(RangeError)
    expect(() => findMove(['a', 'b'], ['a'])).toThrow(RangeError)
    expect(() => findMove(['a', 'b', 'c', 'd'], ['b', 'a', 'd', 'c'])).toThrow(RangeError)
  })
})

describe('repeatedIndexes', () => {
  it('marca el segundo y los siguientes de cada repetido, sin contar espacios ni vacíos', () => {
    expect(repeatedIndexes(['envios', 'pagos', ' envios', '', '', 'pagos'])).toEqual([2, 5])
    expect(repeatedIndexes(['a', 'b'])).toEqual([])
  })
})

describe('listFieldErrors', () => {
  it('lee el error de cada elemento y el de la lista', () => {
    const errors = Object.assign([undefined, { message: 'Requerido' }], {
      root: { message: 'Entre 1 y 3 líneas' },
    })

    expect(listFieldErrors(errors, 3)).toEqual({
      list: 'Entre 1 y 3 líneas',
      items: [undefined, 'Requerido', undefined],
    })
  })

  it('lee un error de la lista sin errores por elemento', () => {
    expect(listFieldErrors({ message: 'Máximo 10 medios de pago' }, 1)).toEqual({
      list: 'Máximo 10 medios de pago',
      items: [undefined],
    })
    expect(listFieldErrors(undefined, 0)).toEqual({ list: undefined, items: [] })
  })

  it('lanza RangeError con una cantidad inválida', () => {
    expect(() => listFieldErrors(undefined, -1)).toThrow(RangeError)
  })
})
