import { describe, expect, it } from 'vitest'
import { ApiError } from '@galpon/api-client'
import { describeSubmitError } from './submit-error'

const MESSAGES = { network: 'Sin conexión', unexpected: 'Inesperado' }

/** Un error de la API con los datos que importan para el formulario. */
function apiError(
  kind: ConstructorParameters<typeof ApiError>[0]['kind'],
  message: string,
  fieldErrors: Record<string, string> = {},
): ApiError {
  return new ApiError({
    kind,
    status: kind === 'network' ? null : 422,
    problem: null,
    message,
    fieldErrors,
  })
}

describe('describeSubmitError', () => {
  it('un error de red da el mensaje de red', () => {
    expect(describeSubmitError(apiError('network', 'x'), ['name'], MESSAGES)).toEqual({
      fieldErrors: {},
      message: 'Sin conexión',
    })
  })

  it('un error que no es de la API da el mensaje inesperado', () => {
    expect(describeSubmitError(new Error('boom'), ['name'], MESSAGES)).toEqual({
      fieldErrors: {},
      message: 'Inesperado',
    })
  })

  it('un 422 deja cada mensaje en su campo y no agrega un mensaje general', () => {
    const error = apiError('validation', 'Datos inválidos', {
      name: 'Muy corto',
      email: 'Inválido',
    })
    expect(describeSubmitError(error, ['name', 'email'], MESSAGES)).toEqual({
      fieldErrors: { name: 'Muy corto', email: 'Inválido' },
      message: null,
    })
  })

  it('el error de un campo que el formulario no tiene pasa al mensaje general', () => {
    const error = apiError('validation', 'Datos inválidos', { cuit: 'Inválido' })
    expect(describeSubmitError(error, ['name'], MESSAGES)).toEqual({
      fieldErrors: {},
      message: 'Inválido',
    })
  })

  it('cualquier otro error de la API muestra el mensaje que trae', () => {
    const error = apiError('rate_limited', 'Demasiados intentos')
    expect(describeSubmitError(error, ['name'], MESSAGES)).toEqual({
      fieldErrors: {},
      message: 'Demasiados intentos',
    })
  })
})
