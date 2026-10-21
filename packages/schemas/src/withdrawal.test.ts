import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Withdrawal } from './withdrawal'
import { issuesOf } from './test/helpers'
import { withdrawalSchema } from './withdrawal'

const validWithdrawal = { name: 'Lucía Gómez', email: 'lucia@ejemplo.com' }

describe('withdrawalSchema', () => {
  it('es válido con solo el nombre y el email (Disp. 954/2025: no se exigen más datos)', () => {
    expect(withdrawalSchema.parse(validWithdrawal)).toEqual({
      name: 'Lucía Gómez',
      email: 'lucia@ejemplo.com',
    })
  })

  it('normaliza cada campo', () => {
    expect(
      withdrawalSchema.parse({
        name: ' Lucía Gómez ',
        email: ' Lucia@Ejemplo.com ',
        orderNumber: ' glp-12345 ',
        comment: ' No lo quiero. ',
        website: '',
      }),
    ).toEqual({
      name: 'Lucía Gómez',
      email: 'lucia@ejemplo.com',
      orderNumber: 'GLP-12345',
      comment: 'No lo quiero.',
      website: '',
    })
  })

  it.each(['A', '1234', undefined])('rechaza el nombre %j', (name) => {
    expect(issuesOf(withdrawalSchema, { ...validWithdrawal, name })).toHaveLength(1)
  })

  it('pide el nombre con "Requerido" si viene vacío', () => {
    expect(issuesOf(withdrawalSchema, { ...validWithdrawal, name: '' })).toEqual([
      { path: ['name'], message: 'Requerido' },
    ])
  })

  it('rechaza un email inválido', () => {
    expect(issuesOf(withdrawalSchema, { ...validWithdrawal, email: 'vos@' })).toEqual([
      { path: ['email'], message: 'Ingresá un email válido' },
    ])
  })

  it.each([undefined, '', '   '])(
    'el número de pedido ausente o vacío (%j) queda en undefined',
    (orderNumber) => {
      expect(
        withdrawalSchema.parse({ ...validWithdrawal, orderNumber }).orderNumber,
      ).toBeUndefined()
    },
  )

  it('rechaza un número de pedido con otro formato', () => {
    expect(issuesOf(withdrawalSchema, { ...validWithdrawal, orderNumber: 'GLP-1' })).toEqual([
      { path: ['orderNumber'], message: 'El número tiene el formato GLP-12345' },
    ])
  })

  it.each([undefined, '', '   '])(
    'el comentario ausente o vacío (%j) queda en undefined',
    (comment) => {
      expect(withdrawalSchema.parse({ ...validWithdrawal, comment }).comment).toBeUndefined()
    },
  )

  it('acepta un comentario de hasta 2000 caracteres y rechaza uno más', () => {
    expect(
      withdrawalSchema.safeParse({ ...validWithdrawal, comment: 'a'.repeat(2000) }).success,
    ).toBe(true)
    expect(issuesOf(withdrawalSchema, { ...validWithdrawal, comment: 'a'.repeat(2001) })).toEqual([
      { path: ['comment'], message: 'Máximo 2000 caracteres' },
    ])
  })

  it('rechaza el campo trampa con contenido', () => {
    expect(issuesOf(withdrawalSchema, { ...validWithdrawal, website: 'spam' })).toHaveLength(1)
  })

  it('deja opcionales el número de pedido y el comentario en el tipo de salida', () => {
    expectTypeOf<Withdrawal['orderNumber']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Withdrawal['comment']>().toEqualTypeOf<string | undefined>()
  })
})
