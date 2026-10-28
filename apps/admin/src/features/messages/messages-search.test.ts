import { describe, expect, it } from 'vitest'
import { messagesQueryOf, messagesSearchSchema } from './messages-search'

describe('messagesSearchSchema', () => {
  it('por omisión muestra todos los mensajes desde la primera página', () => {
    expect(messagesSearchSchema.parse({})).toEqual({ pagina: 1 })
  })

  it('acepta el tipo, "solo sin leer" y la página', () => {
    expect(messagesSearchSchema.parse({ tipo: 'contacto', sinLeer: 1, pagina: '2' })).toEqual({
      tipo: 'contacto',
      sinLeer: 1,
      pagina: 2,
    })
  })

  it('descarta valores que no sirven', () => {
    expect(messagesSearchSchema.parse({ tipo: 'spam', sinLeer: 'si', pagina: -1 })).toEqual({
      pagina: 1,
    })
  })
})

describe('messagesQueryOf', () => {
  it('traduce la búsqueda de la URL a la consulta de la API', () => {
    expect(messagesQueryOf({ pagina: 1 })).toEqual({ page: 1 })
    expect(messagesQueryOf({ tipo: 'arrepentimiento', sinLeer: 1, pagina: 3 })).toEqual({
      kind: 'withdrawal',
      read: false,
      page: 3,
    })
    expect(messagesQueryOf({ tipo: 'contacto', pagina: 1 })).toEqual({ kind: 'contact', page: 1 })
  })
})
