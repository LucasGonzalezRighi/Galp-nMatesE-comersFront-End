import type { FieldError, Problem } from './generated/schema'

/**
 * Clase de error de la API, para decidir qué mostrar sin mirar códigos HTTP.
 *
 * - `validation`: los datos no son válidos (400, 422 y cualquier otro 4xx sin categoría propia).
 * - `unauthorized`: falta la sesión (401).
 * - `forbidden`: la sesión no alcanza o falló el token anti-CSRF (403).
 * - `not_found`: no existe (404).
 * - `conflict`: choca con el estado actual (409).
 * - `rate_limited`: demasiados pedidos (429); `retryAfterSeconds` dice cuánto esperar.
 * - `server`: falló el servidor (5xx) o respondió algo inesperado.
 * - `network`: no hubo respuesta (sin conexión, CORS, corte).
 */
export type ApiErrorKind =
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'server'
  | 'network'

/** Datos para construir un {@link ApiError}. */
export interface ApiErrorInit {
  /** Clase de error. */
  kind: ApiErrorKind
  /** Estado HTTP, o `null` si no hubo respuesta. */
  status: number | null
  /** Cuerpo `application/problem+json` de la respuesta, si lo trajo. */
  problem: Problem | null
  /** Mensaje en español, listo para mostrar. */
  message: string
  /** Mensaje por campo, indexado por la ruta del campo (`customer.email`). */
  fieldErrors?: Readonly<Record<string, string>>
  /** Segundos que pidió esperar la cabecera `Retry-After`. */
  retryAfterSeconds?: number | null
  /** Error original que causó este (por ejemplo, el `TypeError` de `fetch`). */
  cause?: unknown
}

/**
 * Error de una llamada a la API.
 *
 * Todo lo que falla (una respuesta de error o la falta de respuesta) llega como `ApiError`, con
 * un `kind` para decidir qué mostrar, el `problem` del servidor cuando lo hay y, en las
 * validaciones, el mensaje de cada campo.
 */
export class ApiError extends Error {
  /** Clase de error. */
  readonly kind: ApiErrorKind
  /** Estado HTTP, o `null` si no hubo respuesta (`kind: 'network'`). */
  readonly status: number | null
  /** Cuerpo `application/problem+json` de la respuesta, o `null` si no lo trajo o no tenía esa forma. */
  readonly problem: Problem | null
  /** Primer mensaje de cada campo con error, por ruta (`customer.email`); vacío si no hay detalle. */
  readonly fieldErrors: Readonly<Record<string, string>>
  /** Segundos que pidió esperar `Retry-After`, o `null` si no vino (o no eran segundos enteros). */
  readonly retryAfterSeconds: number | null

  /** @param init - Los datos del error. */
  constructor(init: ApiErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause })
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status
    this.problem = init.problem
    this.fieldErrors = init.fieldErrors ?? {}
    this.retryAfterSeconds = init.retryAfterSeconds ?? null
  }
}

/** Mensaje por defecto de cada clase de error, para cuando el servidor no manda `detail` ni `title`. */
const DEFAULT_MESSAGES: Readonly<Record<ApiErrorKind, string>> = {
  validation: 'Los datos enviados no son válidos.',
  not_found: 'No encontramos lo que buscabas.',
  conflict: 'No se pudo completar porque algo cambió. Probá de nuevo.',
  unauthorized: 'Iniciá sesión para continuar.',
  forbidden: 'No tenés permiso para hacer esto.',
  rate_limited: 'Hiciste demasiados intentos. Esperá un momento y probá de nuevo.',
  server: 'Hubo un problema en el servidor. Probá de nuevo en unos minutos.',
  network: 'No pudimos conectarnos con el servidor. Revisá tu conexión.',
}

/**
 * Indica si un valor es un {@link ApiError}.
 *
 * @param error - Lo que atrapó un `catch` o llegó como `error` de una consulta.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Es `true` si `value` es un objeto (no `null`). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Es `true` si `body` tiene la forma mínima de un `Problem` (`type`, `title` y `status`). */
function isProblem(body: unknown): body is Problem {
  return (
    isRecord(body) &&
    typeof body.type === 'string' &&
    typeof body.title === 'string' &&
    typeof body.status === 'number'
  )
}

/** Es `true` si `value` tiene la forma de un `FieldError` con `field` y `message` de texto. */
function isFieldError(value: unknown): value is FieldError {
  return isRecord(value) && typeof value.field === 'string' && typeof value.message === 'string'
}

/** Clase de error de un estado HTTP de error. */
function kindFromStatus(status: number): ApiErrorKind {
  switch (status) {
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 429:
      return 'rate_limited'
    default:
      return status >= 400 && status < 500 ? 'validation' : 'server'
  }
}

/** Mensaje de cada campo del problema; si un campo se repite, gana el primero. */
function fieldErrorsFrom(problem: Problem | null): Readonly<Record<string, string>> {
  const byField = new Map<string, string>()
  const errors: unknown = problem?.errors
  if (Array.isArray(errors)) {
    for (const entry of errors as unknown[]) {
      if (isFieldError(entry) && !byField.has(entry.field)) byField.set(entry.field, entry.message)
    }
  }
  return Object.freeze(Object.fromEntries(byField))
}

/** Segundos de `Retry-After`; `null` si falta o no es un entero no negativo. */
function parseRetryAfter(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value.trim())) return null
  const seconds = Number(value)
  return Number.isSafeInteger(seconds) ? seconds : null
}

/**
 * Arma el {@link ApiError} de una respuesta HTTP de error.
 *
 * El `kind` sale del estado (ver {@link ApiErrorKind}). El mensaje es el `detail` del problema,
 * si no su `title` y, si el cuerpo no era un `application/problem+json`, uno por defecto según
 * el `kind`. `Retry-After` solo se entiende en segundos enteros.
 *
 * @param response - La respuesta de error (estado 3xx, 4xx o 5xx).
 * @param body - Su cuerpo ya leído: el JSON parseado, el texto si no era JSON o `undefined`.
 * @throws {RangeError} Si la respuesta es exitosa (2xx).
 */
export function apiErrorFromResponse(response: Response, body: unknown): ApiError {
  if (response.ok) {
    throw new RangeError(
      `apiErrorFromResponse necesita una respuesta con error, y recibió el estado ${String(response.status)}`,
    )
  }
  const kind = kindFromStatus(response.status)
  const problem = isProblem(body) ? body : null
  return new ApiError({
    kind,
    status: response.status,
    problem,
    message: problem?.detail ?? problem?.title ?? DEFAULT_MESSAGES[kind],
    fieldErrors: fieldErrorsFrom(problem),
    retryAfterSeconds: parseRetryAfter(response.headers.get('Retry-After')),
  })
}

/**
 * Arma el {@link ApiError} de una llamada que no llegó a tener respuesta.
 *
 * @param cause - Lo que lanzó `fetch` (conserva en `cause`).
 */
export function networkError(cause: unknown): ApiError {
  return new ApiError({
    kind: 'network',
    status: null,
    problem: null,
    message: DEFAULT_MESSAGES.network,
    cause,
  })
}
