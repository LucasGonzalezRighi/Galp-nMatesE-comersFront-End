import { describe, expect, it } from 'vitest'
import { storeProductUrl, toParagraphs } from './review-format'

describe('storeProductUrl', () => {
  it('arma la ficha del producto en la tienda', () => {
    expect(storeProductUrl('http://localhost:3000', 'mate-imperial-premium')).toBe(
      'http://localhost:3000/producto/mate-imperial-premium',
    )
  })

  it('lanza RangeError si falta la tienda o el slug', () => {
    expect(() => storeProductUrl('', 'mate')).toThrow(RangeError)
    expect(() => storeProductUrl('http://localhost:3000', ' ')).toThrow(RangeError)
  })
})

describe('toParagraphs', () => {
  it('separa por renglones y descarta los vacíos', () => {
    expect(toParagraphs('Primero.\r\n\r\n  Segundo.\nTercero. ')).toEqual([
      'Primero.',
      'Segundo.',
      'Tercero.',
    ])
    expect(toParagraphs('   ')).toEqual([])
  })
})
