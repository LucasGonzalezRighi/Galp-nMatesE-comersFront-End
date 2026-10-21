import { describe, expect, it } from 'vitest'
import type { ApiErrorKind } from './errors'
import { ApiError, apiErrorFromResponse, isApiError, networkError } from './errors'

const validationProblem = {
  type: 'validation_error',
  title: 'Los datos no son válidos',
  status: 422,
  detail: 'Revisá los campos marcados.',
  errors: [{ field: 'email', code: 'invalid_format', message: 'Ingresá un email válido' }],
}

describe('apiErrorFromResponse', () => {
  it('422 con problem+json es "validation" y expone el mensaje de cada campo', () => {
    const response = new Response(JSON.stringify(validationProblem), {
      status: 422,
      headers: { 'Content-Type': 'application/problem+json' },
    })
    const error = apiErrorFromResponse(response, validationProblem)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.kind).toBe('validation')
    expect(error.status).toBe(422)
    expect(error.problem).toEqual(validationProblem)
    expect(error.fieldErrors).toEqual({ email: 'Ingresá un email válido' })
    expect(error.message).toBe('Revisá los campos marcados.')
    expect(error.retryAfterSeconds).toBeNull()
  })

  it.each<[number, ApiErrorKind]>([
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [500, 'server'],
    [502, 'server'],
    [418, 'validation'],
  ])('el estado %i es "%s"', (status, kind) => {
    const error = apiErrorFromResponse(new Response(null, { status }), undefined)
    expect(error.kind).toBe(kind)
    expect(error.status).toBe(status)
    expect(error.problem).toBeNull()
    expect(error.message).not.toBe('')
  })

  it('429 con Retry-After guarda los segundos', () => {
    const response = new Response(null, { status: 429, headers: { 'Retry-After': '30' } })
    const error = apiErrorFromResponse(response, undefined)
    expect(error.kind).toBe('rate_limited')
    expect(error.retryAfterSeconds).toBe(30)
  })

  it.each([['abc'], ['-5'], ['1.5'], ['Wed, 21 Oct 2026 07:28:00 GMT'], ['9'.repeat(30)]])(
    'ignora un Retry-After que no son segundos enteros (%s)',
    (value) => {
      const response = new Response(null, { status: 429, headers: { 'Retry-After': value } })
      expect(apiErrorFromResponse(response, undefined).retryAfterSeconds).toBeNull()
    },
  )

  it('un cuerpo que no es JSON deja problem en null y usa el mensaje del tipo de error', () => {
    const response = new Response('<h1>Bad Gateway</h1>', { status: 502 })
    const error = apiErrorFromResponse(response, '<h1>Bad Gateway</h1>')
    expect(error.problem).toBeNull()
    expect(error.fieldErrors).toEqual({})
    expect(error.kind).toBe('server')
    expect(error.message).toBe('Hubo un problema en el servidor. Probá de nuevo en unos minutos.')
  })

  it.each([
    [null],
    [42],
    [{}],
    [{ type: 'x', title: 'y' }],
    [{ type: 1, title: 'y', status: 500 }],
  ])('un cuerpo que no tiene forma de Problem se descarta (%j)', (body) => {
    expect(apiErrorFromResponse(new Response(null, { status: 500 }), body).problem).toBeNull()
  })

  it('sin detail usa el title, y sin ninguno de los dos el mensaje por defecto', () => {
    const conTitle = apiErrorFromResponse(new Response(null, { status: 404 }), {
      type: 'not_found',
      title: 'No existe',
      status: 404,
    })
    expect(conTitle.message).toBe('No existe')
    const sinProblem = apiErrorFromResponse(new Response(null, { status: 404 }), undefined)
    expect(sinProblem.message).toBe('No encontramos lo que buscabas.')
  })

  it('con dos errores en el mismo campo se queda con el primero y descarta los mal formados', () => {
    const error = apiErrorFromResponse(new Response(null, { status: 422 }), {
      ...validationProblem,
      errors: [
        { field: 'email', code: 'required', message: 'Ingresá tu email' },
        { field: 'email', code: 'invalid_format', message: 'Ingresá un email válido' },
        { field: 'customer.phone', code: 'too_short', message: 'El teléfono es muy corto' },
        { field: 7, code: 'x', message: 'ignorado' },
        'ignorado',
      ],
    })
    expect(error.fieldErrors).toEqual({
      email: 'Ingresá tu email',
      'customer.phone': 'El teléfono es muy corto',
    })
  })

  it('el mapa de campos no se puede modificar', () => {
    const error = apiErrorFromResponse(new Response(null, { status: 422 }), validationProblem)
    expect(Object.isFrozen(error.fieldErrors)).toBe(true)
  })

  it('no acepta una respuesta exitosa', () => {
    expect(() => apiErrorFromResponse(new Response(null, { status: 200 }), undefined)).toThrow(
      new RangeError(
        'apiErrorFromResponse necesita una respuesta con error, y recibió el estado 200',
      ),
    )
  })
})

describe('networkError', () => {
  it('es un ApiError "network" sin estado ni problema, y conserva la causa', () => {
    const cause = new TypeError('fetch failed')
    const error = networkError(cause)
    expect(error.kind).toBe('network')
    expect(error.status).toBeNull()
    expect(error.problem).toBeNull()
    expect(error.fieldErrors).toEqual({})
    expect(error.retryAfterSeconds).toBeNull()
    expect(error.cause).toBe(cause)
    expect(error.message).toBe('No pudimos conectarnos con el servidor. Revisá tu conexión.')
  })
})

describe('isApiError', () => {
  it('reconoce los ApiError y nada más', () => {
    expect(isApiError(networkError(undefined))).toBe(true)
    expect(isApiError(new Error('x'))).toBe(false)
    expect(isApiError({ kind: 'network' })).toBe(false)
    expect(isApiError(null)).toBe(false)
  })

  it('un ApiError es un Error con nombre propio', () => {
    const error = networkError(undefined)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ApiError')
  })
})
