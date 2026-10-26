import type { ChangeNotice, FieldError } from '../generated/schema'

/** Métodos HTTP que usa el contrato. */
export type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'

/** Todos los métodos HTTP que reconoce el router simulado. */
export const HTTP_METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Indica si un texto es un método HTTP del contrato.
 *
 * @param value - Texto a revisar, en mayúsculas.
 */
export function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value)
}

/** Identificador `type` del problema que corresponde a cada estado HTTP, si no se indica otro. */
const PROBLEM_TYPES: Readonly<Record<number, string>> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  409: 'conflict',
  422: 'validation_error',
  429: 'rate_limited',
  500: 'server_error',
  501: 'not_implemented',
}

/**
 * Respuesta con cuerpo JSON.
 *
 * @param data - Se serializa con `JSON.stringify`.
 * @param status - Estado HTTP (200 por omisión).
 */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Respuesta `204` sin cuerpo. */
export function noContent(): Response {
  return new Response(null, { status: 204 })
}

/**
 * Respuesta de error `application/problem+json`, como las del contrato.
 *
 * @param status - Estado HTTP.
 * @param title - Resumen corto del error, en español.
 * @param extras - `detail` (explicación), `errors` (un error por campo), `changes` (qué cambió, en
 *   los conflictos de pedido) y `type`; si falta `type` se deduce del estado (`not_found` para 404,
 *   `validation_error` para 422…).
 */
export function problem(
  status: number,
  title: string,
  extras: { detail?: string; errors?: FieldError[]; changes?: ChangeNotice[]; type?: string } = {},
): Response {
  const body = {
    type: extras.type ?? PROBLEM_TYPES[status] ?? 'error',
    title,
    status,
    ...(extras.detail === undefined ? {} : { detail: extras.detail }),
    ...(extras.errors === undefined ? {} : { errors: extras.errors }),
    ...(extras.changes === undefined ? {} : { changes: extras.changes }),
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

/**
 * Respuesta `422` con el detalle de cada campo inválido.
 *
 * @param errors - Un error por campo.
 */
export function validationProblem(errors: FieldError[]): Response {
  return problem(422, 'Los datos no son válidos', { detail: 'Revisá los campos marcados.', errors })
}

/**
 * Respuesta `404` de un recurso que no existe o no está publicado.
 *
 * @param detail - Qué no se encontró, en español.
 */
export function notFound(detail: string): Response {
  return problem(404, 'No encontrado', { detail })
}

/**
 * Corta un handler con una respuesta de error: el fetch simulado la devuelve tal cual.
 *
 * Los handlers lo lanzan desde cualquier punto (una guardia, la lectura del cuerpo, la validación
 * de la query) en lugar de devolver la respuesta a mano por cada nivel de llamadas.
 */
export class ResponseError extends Error {
  /** La respuesta que se le devuelve a quien hizo el pedido. */
  readonly response: Response

  /**
   * @param response - Respuesta de error (`problem`, `validationProblem`, `notFound`…).
   */
  constructor(response: Response) {
    super(`Respuesta ${String(response.status)}`)
    this.name = 'ResponseError'
    this.response = response
  }
}
