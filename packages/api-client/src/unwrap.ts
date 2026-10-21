import { ApiError, apiErrorFromResponse, isApiError, networkError, unexpectedError } from './errors'

/** Lo que devuelve una llamada de `openapi-fetch`: los datos o el error, y siempre la respuesta. */
interface CallResult<T> {
  data?: T
  error?: unknown
  response: Response
}

/**
 * Espera la llamada. Si lanza un `TypeError` (así falla `fetch` sin conexión, por CORS o por un
 * corte) es que no hubo respuesta; cualquier otra cosa (por ejemplo el `SyntaxError` de un 2xx
 * que no es JSON) es una falla inesperada del servidor.
 */
async function settle<T>(call: Promise<CallResult<T>>): Promise<CallResult<T>> {
  try {
    return await call
  } catch (cause) {
    if (isApiError(cause)) throw cause
    throw cause instanceof TypeError ? networkError(cause) : unexpectedError(cause)
  }
}

/**
 * Desenvuelve la llamada de `openapi-fetch` y devuelve solo los datos.
 *
 * @param call - El resultado de `api.GET(...)`, `api.POST(...)`, etc.
 * @returns El cuerpo de la respuesta exitosa.
 * @throws {ApiError} Con `kind: 'network'` si la llamada lanzó un `TypeError` (no hubo respuesta),
 * con `kind: 'server'` si lanzó cualquier otra cosa (por ejemplo un 2xx que no es JSON) o si fue
 * exitosa pero sin cuerpo, y con la clase que corresponda al estado si la respuesta fue un error.
 */
export async function unwrap<T>(call: Promise<CallResult<T>>): Promise<T> {
  const { data, error, response } = await settle(call)
  if (!response.ok) throw apiErrorFromResponse(response, error)
  if (data === undefined) {
    throw new ApiError({
      kind: 'server',
      status: response.status,
      problem: null,
      message: 'La API respondió sin contenido.',
    })
  }
  return data
}

/**
 * Como {@link unwrap}, para las respuestas sin cuerpo (204).
 *
 * @param call - El resultado de `api.POST(...)`, etc.
 * @throws {ApiError} Igual que {@link unwrap}.
 */
export async function unwrapVoid(call: Promise<CallResult<unknown>>): Promise<void> {
  const { error, response } = await settle(call)
  if (!response.ok) throw apiErrorFromResponse(response, error)
}
