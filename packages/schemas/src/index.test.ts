import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import * as schemas from './index'
import { shippingSchema } from './index'
import { messagesOf } from './test/helpers'

/** Frases en inglés que usa Zod por defecto en sus errores. */
const ENGLISH_PATTERN = /invalid|expected|too (?:small|big)|unrecognized|required|must|received/i

/** Entradas de cualquier tipo, para provocar los errores de tipo y de forma de cada schema. */
const WRONG_INPUTS: unknown[] = [undefined, null, 42, 'texto', true, [], {}, { method: 'drone' }]

/** Todos los schemas que exporta el paquete, más uno de cada fábrica de schemas. */
const ALL_SCHEMAS: [string, z.ZodType][] = [
  ['quantitySchema(5)', schemas.quantitySchema(5)],
  ['optionalTextSchema(5)', schemas.optionalTextSchema(5)],
]
for (const [name, value] of Object.entries(schemas)) {
  if (value instanceof z.ZodType) ALL_SCHEMAS.push([name, value])
}

describe('idioma de los errores', () => {
  it('el paquete exporta schemas para recorrer', () => {
    expect(ALL_SCHEMAS.length).toBeGreaterThan(30)
  })

  it('un método de envío desconocido da un error en español', () => {
    expect(messagesOf(shippingSchema, { method: 'drone' })).toEqual(['Entrada inválida'])
  })

  it('una dirección que no es un objeto da un error en español', () => {
    expect(messagesOf(shippingSchema, { method: 'home', address: 'Av. Siempre Viva' })).toEqual([
      'Entrada inválida: se esperaba objeto, recibido texto',
    ])
  })

  it('una cantidad fuera de rango o que no es número da un error en español', () => {
    const quantity = schemas.quantitySchema(5)
    expect(messagesOf(quantity, 0)).toEqual(['Demasiado pequeño: se esperaba que número fuera >=1'])
    expect(messagesOf(quantity, 6)).toEqual(['Demasiado grande: se esperaba que número fuera <=5'])
    expect(messagesOf(quantity, 'tres')).toEqual([
      'Entrada inválida: se esperaba número, recibido texto',
    ])
  })

  it.each(ALL_SCHEMAS)('%s no da ningún error en inglés', (_name, schema) => {
    for (const input of WRONG_INPUTS) {
      for (const message of messagesOf(schema, input)) {
        expect(message).not.toMatch(ENGLISH_PATTERN)
      }
    }
  })
})
