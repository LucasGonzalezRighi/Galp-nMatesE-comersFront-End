import { describe, expect, it } from 'vitest'
import { replyMailto, toParagraphs } from './message-format'

describe('replyMailto', () => {
  it('a un contacto le responde con el asunto de la consulta', () => {
    expect(replyMailto({ email: 'ana@example.com', kind: 'contact', code: null })).toBe(
      'mailto:ana%40example.com?subject=Tu%20consulta%20a%20Galp%C3%B3n%20Mates',
    )
  })

  it('a un arrepentimiento le responde con su código en el asunto', () => {
    expect(replyMailto({ email: 'ana@example.com', kind: 'withdrawal', code: 'ARR-000001' })).toBe(
      'mailto:ana%40example.com?subject=Tu%20solicitud%20de%20arrepentimiento%20ARR-000001',
    )
  })

  it('codifica el email: un "?" o un "&" no agregan campos al borrador', () => {
    const href = replyMailto({
      email: 'a?cc=b%40x.com&body=hola@example.com',
      kind: 'contact',
      code: null,
    })

    expect(href).toBe(
      'mailto:a%3Fcc%3Db%2540x.com%26body%3Dhola%40example.com?subject=Tu%20consulta%20a%20Galp%C3%B3n%20Mates',
    )
    expect([...new URL(href).searchParams.keys()]).toEqual(['subject'])
  })

  it('lanza RangeError sin email o con un arrepentimiento sin código', () => {
    expect(() => replyMailto({ email: ' ', kind: 'contact', code: null })).toThrow(RangeError)
    expect(() => replyMailto({ email: 'ana@example.com', kind: 'withdrawal', code: null })).toThrow(
      RangeError,
    )
  })
})

describe('toParagraphs', () => {
  it('separa por renglones y descarta los vacíos', () => {
    expect(toParagraphs('Hola.\r\n\r\n ¿Cómo va? ')).toEqual(['Hola.', '¿Cómo va?'])
    expect(toParagraphs('')).toEqual([])
  })
})
