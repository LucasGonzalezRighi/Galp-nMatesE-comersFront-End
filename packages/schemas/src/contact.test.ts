import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Contact, ContactReason } from './contact'
import { CONTACT_REASONS, contactSchema } from './contact'
import { issuesOf } from './test/helpers'

const validContact = {
  name: 'Lucía Gómez',
  email: 'lucia@ejemplo.com',
  reason: 'Pedido',
  message: 'Quiero saber dónde está mi pedido.',
}

describe('CONTACT_REASONS', () => {
  it('tiene los cinco motivos del formulario, en orden', () => {
    expect(CONTACT_REASONS).toEqual(['Pedido', 'Envío', 'Cambio', 'Arrepentimiento', 'Otro'])
    expectTypeOf<ContactReason>().toEqualTypeOf<
      'Arrepentimiento' | 'Cambio' | 'Envío' | 'Otro' | 'Pedido'
    >()
  })
})

describe('contactSchema', () => {
  it('normaliza cada campo', () => {
    expect(
      contactSchema.parse({
        ...validContact,
        name: ' Lucía Gómez ',
        email: ' Lucia@Ejemplo.com ',
        orderNumber: ' glp-12345 ',
        message: '  Quiero saber dónde está mi pedido.  ',
        website: '',
      }),
    ).toEqual({
      name: 'Lucía Gómez',
      email: 'lucia@ejemplo.com',
      orderNumber: 'GLP-12345',
      reason: 'Pedido',
      message: 'Quiero saber dónde está mi pedido.',
      website: '',
    })
  })

  it.each(CONTACT_REASONS)('acepta el motivo %j', (reason) => {
    expect(contactSchema.parse({ ...validContact, reason }).reason).toBe(reason)
  })

  it.each(['Garantía', '', 'pedido', undefined])('rechaza el motivo %j', (reason) => {
    expect(issuesOf(contactSchema, { ...validContact, reason })).toEqual([
      { path: ['reason'], message: 'Elegí un motivo' },
    ])
  })

  it.each(['', ' ', 'A', undefined])('pide el nombre si llega %j', (name) => {
    expect(issuesOf(contactSchema, { ...validContact, name })).toEqual([
      { path: ['name'], message: 'Contanos tu nombre' },
    ])
  })

  it('acepta un nombre de 2 a 50 caracteres y rechaza uno más', () => {
    expect(contactSchema.safeParse({ ...validContact, name: 'Jo' }).success).toBe(true)
    expect(contactSchema.safeParse({ ...validContact, name: 'a'.repeat(50) }).success).toBe(true)
    expect(issuesOf(contactSchema, { ...validContact, name: 'a'.repeat(51) })).toEqual([
      { path: ['name'], message: 'Máximo 50 caracteres' },
    ])
  })

  it('rechaza un email inválido', () => {
    expect(issuesOf(contactSchema, { ...validContact, email: 'sin-arroba' })).toEqual([
      { path: ['email'], message: 'Ingresá un email válido' },
    ])
  })

  it.each(['', 'a'.repeat(9), `  ${'a'.repeat(8)}  `, undefined])(
    'pide más mensaje si llega %j',
    (message) => {
      expect(issuesOf(contactSchema, { ...validContact, message })).toEqual([
        { path: ['message'], message: 'Escribí al menos 10 caracteres' },
      ])
    },
  )

  it('acepta un mensaje de 10 a 2000 caracteres y rechaza uno más', () => {
    expect(contactSchema.safeParse({ ...validContact, message: 'a'.repeat(10) }).success).toBe(true)
    expect(contactSchema.safeParse({ ...validContact, message: 'a'.repeat(2000) }).success).toBe(
      true,
    )
    expect(issuesOf(contactSchema, { ...validContact, message: 'a'.repeat(2001) })).toEqual([
      { path: ['message'], message: 'Máximo 2000 caracteres' },
    ])
  })

  it.each([undefined, '', '   '])(
    'el número de pedido ausente o vacío (%j) queda en undefined',
    (orderNumber) => {
      expect(contactSchema.parse({ ...validContact, orderNumber }).orderNumber).toBeUndefined()
    },
  )

  it('rechaza un número de pedido con otro formato', () => {
    expect(issuesOf(contactSchema, { ...validContact, orderNumber: 'GLP-123' })).toEqual([
      { path: ['orderNumber'], message: 'El número tiene el formato GLP-12345' },
    ])
  })

  it('rechaza el campo trampa con contenido', () => {
    expect(issuesOf(contactSchema, { ...validContact, website: 'spam' })).toHaveLength(1)
  })

  it('devuelve el motivo con el tipo de la lista', () => {
    expectTypeOf<Contact['reason']>().toEqualTypeOf<ContactReason>()
    expectTypeOf<Contact['orderNumber']>().toEqualTypeOf<string | undefined>()
  })
})
