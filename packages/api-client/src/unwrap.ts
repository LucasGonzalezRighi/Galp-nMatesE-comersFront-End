import { ApiError, apiErrorFromResponse, isApiError, networkError } from './errors'

/** Lo que devuelve una llamada de `openapi-fetch`: los datos o el error, y siempre la respuesta. */
interface CallResult<T> {
  data?: T
  error?: unknown
  response: Response
}

/** Espera la llamada; si lanza algo que no es un `ApiError`, es que no hubo respuesta. */
async function settle<T>(call: Promise<CallResult<T>>): Promise<CallResult<T>> {
  try {
    return await call
  } catch (cause) {
    throw isApiError(cause) ? cause : networkError(cause)
  }
}

/**
 * Desenvuelve la llamada de `openapi-fetch` y devuelve solo los datos.
 *
 * @param call - El resultado de `api.GET(...)`, `api.POST(...)`, etc.
 * @returns El cuerpo de la respuesta exitosa.
 * @throws {ApiError} Con `kind: 'network'` si la llamada lanzó (no hubo respuesta), con la clase
 * que corresponda al estado si la respuesta fue un error, y con `kind: 'server'` si fue exitosa
 * pero sin cuerpo.
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
