import { describe, expect, it, vi } from 'vitest'
import {
  isValidRevalidateSecret,
  REVALIDATE_TAG_PATTERN,
  revalidateValidTags,
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

describe('revalidateValidTags', () => {
  it('regenera las etiquetas válidas con su perfil e ignora el resto sin tirar', () => {
    const revalidate = vi.fn<(tag: string, profile: 'max' | { expire: 0 }) => void>()

    expect(() => {
      revalidateValidTags(['products', '../x', 'content:home', 'product:Mate Imperial'], revalidate)
    }).not.toThrow()

    expect(revalidate.mock.calls).toEqual([
      ['products', { expire: 0 }],
      ['content:home', 'max'],
    ])
  })

  it('sin etiquetas no llama a nada', () => {
    const revalidate = vi.fn<(tag: string, profile: 'max' | { expire: 0 }) => void>()
    revalidateValidTags([], revalidate)
    expect(revalidate).not.toHaveBeenCalled()
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
