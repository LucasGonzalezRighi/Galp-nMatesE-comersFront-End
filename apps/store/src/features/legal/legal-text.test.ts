import { describe, expect, it } from 'vitest'
import { formatUpdatedAt, parseLegalBody } from './legal-text'

describe('parseLegalBody', () => {
  it('arma títulos con id, párrafos con enlaces permitidos y listas', () => {
    expect(
      parseLegalBody('## Uno\n\nHola [acá](/cookies) y [x](javascript:alert(1)).\n\n- a\n- b'),
    ).toEqual([
      { kind: 'heading', id: 'uno', text: 'Uno' },
      {
        kind: 'paragraph',
        inlines: [
          { kind: 'text', text: 'Hola ' },
          { kind: 'link', text: 'acá', href: '/cookies' },
          { kind: 'text', text: ' y [x](javascript:alert(1)).' },
        ],
      },
      {
        kind: 'list',
        items: [[{ kind: 'text', text: 'a' }], [{ kind: 'text', text: 'b' }]],
      },
    ])
  })

  it('acepta enlaces https y deja como texto los http y los relativos sin barra', () => {
    expect(
      parseLegalBody('[AAIP](https://www.argentina.gob.ar/aaip) [a](http://x.com) [b](cuenta)'),
    ).toEqual([
      {
        kind: 'paragraph',
        inlines: [
          { kind: 'link', text: 'AAIP', href: 'https://www.argentina.gob.ar/aaip' },
          { kind: 'text', text: ' [a](http://x.com) [b](cuenta)' },
        ],
      },
    ])
  })

  it('conserva los saltos simples dentro de un párrafo y separa los bloques por líneas en blanco', () => {
    expect(parseLegalBody('  Línea uno\r\nLínea dos  \r\n\r\n\n Tercero.\n')).toEqual([
      { kind: 'paragraph', inlines: [{ kind: 'text', text: 'Línea uno\nLínea dos' }] },
      { kind: 'paragraph', inlines: [{ kind: 'text', text: 'Tercero.' }] },
    ])
  })

  it('un bloque con líneas que no empiezan todas con "- " es un párrafo', () => {
    expect(parseLegalBody('- a\nb')).toEqual([
      { kind: 'paragraph', inlines: [{ kind: 'text', text: '- a\nb' }] },
    ])
  })

  it('un título con texto debajo en el mismo bloque suma el resto como otro bloque', () => {
    expect(parseLegalBody('## Datos del vendedor\nRazón social.')).toEqual([
      { kind: 'heading', id: 'datos-del-vendedor', text: 'Datos del vendedor' },
      { kind: 'paragraph', inlines: [{ kind: 'text', text: 'Razón social.' }] },
    ])
  })

  it('no interpreta HTML: queda como texto', () => {
    expect(parseLegalBody('<b>negrita</b> & más')).toEqual([
      { kind: 'paragraph', inlines: [{ kind: 'text', text: '<b>negrita</b> & más' }] },
    ])
  })

  it('devuelve una lista vacía si el texto está vacío', () => {
    expect(parseLegalBody('  \n\n ')).toEqual([])
  })

  it('lanza RangeError si el cuerpo no es texto', () => {
    expect(() => parseLegalBody(42 as unknown as string)).toThrow(RangeError)
  })
})

describe('formatUpdatedAt', () => {
  it('da el día como dd/mm/aaaa sin correrlo por la zona horaria', () => {
    expect(formatUpdatedAt('2026-10-01')).toBe('01/10/2026')
    expect(formatUpdatedAt('2026-12-31')).toBe('31/12/2026')
  })

  it('lanza RangeError si no es un día aaaa-mm-dd', () => {
    expect(() => formatUpdatedAt('01/10/2026')).toThrow(RangeError)
    expect(() => formatUpdatedAt('')).toThrow(RangeError)
  })
})
