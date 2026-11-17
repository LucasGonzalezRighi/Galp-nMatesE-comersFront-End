import { describe, expect, it } from 'vitest'
import { buildMailto } from './mailto'

describe('buildMailto', () => {
  it('codifica el destinatario', () => {
    expect(buildMailto('ana@example.com')).toBe('mailto:ana%40example.com')
  })

  it('codifica el asunto y el cuerpo', () => {
    expect(
      buildMailto('ana@example.com', { subject: 'Tu consulta & más', body: 'Hola,\nAna' }),
    ).toBe('mailto:ana%40example.com?subject=Tu%20consulta%20%26%20m%C3%A1s&body=Hola%2C%0AAna')
  })

  it('un email con ?, &, = o % no agrega campos al borrador', () => {
    const href = buildMailto('a?cc=evil%40x.com&bcc=b@x.com@example.com', { subject: 'Hola' })

    expect(href).toBe('mailto:a%3Fcc%3Devil%2540x.com%26bcc%3Db%40x.com%40example.com?subject=Hola')
    const url = new URL(href)
    expect([...url.searchParams.keys()]).toEqual(['subject'])
    expect(decodeURIComponent(url.pathname)).toBe('a?cc=evil%40x.com&bcc=b@x.com@example.com')
  })

  it('lanza RangeError sin destinatario', () => {
    expect(() => buildMailto(' ')).toThrow(RangeError)
  })
})
