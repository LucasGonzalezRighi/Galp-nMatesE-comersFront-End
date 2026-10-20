import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { shippingSchema } from './checkout'
import { toFieldErrors } from './form-errors'

/** Error de Zod para una entrada que no cumple el schema. */
function errorOf(schema: z.ZodType, input: unknown): z.ZodError {
  const result = schema.safeParse(input)
  if (result.success) throw new Error('La entrada debía ser inválida')
  return result.error
}

describe('toFieldErrors', () => {
  it('une el camino con puntos', () => {
    const schema = z.object({
      name: z.string().min(1, 'Requerido'),
      address: z.object({
        street: z.string().min(1, 'Requerido'),
        city: z.string().min(1, 'Falta'),
      }),
    })
    expect(toFieldErrors(errorOf(schema, { name: '', address: { street: '', city: '' } }))).toEqual(
      {
        name: 'Requerido',
        'address.street': 'Requerido',
        'address.city': 'Falta',
      },
    )
  })

  it('gana el primer mensaje de cada campo', () => {
    const schema = z.object({
      code: z.string().min(3, 'Muy corto').regex(/^\d+$/, 'Solo números'),
    })
    const error = errorOf(schema, { code: 'a' })
    expect(error.issues).toHaveLength(2)
    expect(toFieldErrors(error)).toEqual({ code: 'Muy corto' })
  })

  it('incluye la posición cuando el error está dentro de una lista', () => {
    const schema = z.object({ items: z.array(z.object({ eta: z.string().min(2, 'Muy corto') })) })
    expect(toFieldErrors(errorOf(schema, { items: [{ eta: 'ok' }, { eta: '' }] }))).toEqual({
      'items.1.eta': 'Muy corto',
    })
  })

  it('usa la clave vacía para un error que no es de ningún campo', () => {
    const schema = z.object({ a: z.string(), b: z.string() }).refine(() => false, 'No coinciden')
    expect(toFieldErrors(errorOf(schema, { a: 'x', b: 'y' }))).toEqual({ '': 'No coinciden' })
  })

  it('no falla con claves que son símbolos', () => {
    const key = Symbol('clave')
    const error = new z.ZodError([{ code: 'custom', input: 1, path: ['a', key], message: 'Mal' }])
    expect(toFieldErrors(error)).toEqual({ 'a.Symbol(clave)': 'Mal' })
  })

  it('no confunde un campo con las propiedades heredadas de Object', () => {
    const schema = z.object({ constructor: z.string().min(1, 'Requerido') })
    expect(toFieldErrors(errorOf(schema, { constructor: '' }))).toEqual({
      constructor: 'Requerido',
    })
  })

  it('devuelve un objeto vacío si el error no tiene problemas', () => {
    expect(toFieldErrors(new z.ZodError([]))).toEqual({})
  })

  it('arma los errores de una dirección de envío para el formulario', () => {
    const error = errorOf(shippingSchema, {
      method: 'home',
      address: { number: '742', postalCode: '14', city: 'Springfield', province: 'CABA' },
    })
    expect(toFieldErrors(error)).toEqual({
      'address.street': 'Requerido',
      'address.postalCode': 'Código postal inválido',
    })
  })
})
