import { describe, expect, it } from 'vitest'
import {
  isValidRevalidateSecret,
  REVALIDATE_TAG_PATTERN,
  revalidationProfileFor,
} from './revalidate'

describe('isValidRevalidateSecret', () => {
  it('rechaza un secreto distinto', () => {
    expect(isValidRevalidateSecret('a', 'b')).toBe(false)
  })

  it('acepta el secreto correcto', () => {
    expect(isValidRevalidateSecret('secreto-largo', 'secreto-largo')).toBe(true)
  })

  it('rechaza la ausencia de secreto', () => {
    expect(isValidRevalidateSecret(null, 'secreto-largo')).toBe(false)
    expect(isValidRevalidateSecret('', 'secreto-largo')).toBe(false)
  })

  it('rechaza un secreto de otro largo sin tirar', () => {
    expect(isValidRevalidateSecret('secreto', 'secreto-largo')).toBe(false)
    expect(isValidRevalidateSecret('secreto-largo-y-mas', 'secreto-largo')).toBe(false)
  })

  it('compara los caracteres no ASCII', () => {
    expect(isValidRevalidateSecret('clave-ñandú', 'clave-ñandú')).toBe(true)
    expect(isValidRevalidateSecret('clave-nandu', 'clave-ñandú')).toBe(false)
  })

  it('exige un secreto esperado', () => {
    expect(() => isValidRevalidateSecret('', '')).toThrow(RangeError)
  })
})

describe('revalidationProfileFor', () => {
  it('el contenido se revalida con "max"', () => {
    expect(revalidationProfileFor('content:home')).toBe('max')
  })

  it.each(['products', 'categories', 'settings', 'product:mate-imperial', 'reviews:mate-imperial'])(
    '"%s" vence al instante',
    (tag) => {
      expect(revalidationProfileFor(tag)).toEqual({ expire: 0 })
    },
  )

  it('rechaza una etiqueta que no es válida', () => {
    expect(() => revalidationProfileFor('../x')).toThrow(RangeError)
  })
})

describe('REVALIDATE_TAG_PATTERN', () => {
  it.each([
    'products',
    'categories',
    'settings',
    'product:mate-imperial-premium',
    'reviews:bombillon-curvo',
    'content:product-tabs',
  ])('acepta "%s"', (tag) => {
    expect(REVALIDATE_TAG_PATTERN.test(tag)).toBe(true)
  })

  it.each([
    '../x',
    'orders',
    'product:',
    'product:Mate',
    'content:Home',
    'content:home2',
    'products\n',
    ' products',
    'product:a/b',
  ])('rechaza %j', (tag) => {
    expect(REVALIDATE_TAG_PATTERN.test(tag)).toBe(false)
  })
})
