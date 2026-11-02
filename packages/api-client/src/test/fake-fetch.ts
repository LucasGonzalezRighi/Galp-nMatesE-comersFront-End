import type { ApiFetch } from '../client'

/** Un `fetch` falso que anota cada pedido recibido. */
export interface FakeFetch {
  /** Se pasa a `createApiClient({ fetch })`. */
  fetch: ApiFetch
  /** Los `Request` que llegaron, en orden. */
  requests: Request[]
}

/**
 * Arma un `fetch` falso que registra cada `Request` y contesta con lo que devuelve `respond`.
 *
 * @param respond - Recibe el pedido y su posición (empezando en 0) y devuelve la respuesta.
 * @returns El `fetch` y la lista de pedidos registrados.
 */
export function createFakeFetch(
  respond: (request: Request, index: number) => Response | Promise<Response>,
): FakeFetch {
  const requests: Request[] = []
  return {
    requests,
    fetch: (request) => {
      requests.push(request)
      return Promise.resolve(respond(request, requests.length - 1))
    },
  }
}

/**
 * Respuesta con cuerpo JSON.
 *
 * @param body - Se serializa con `JSON.stringify`.
 * @param status - Estado HTTP (200 por omisión).
 * @param headers - Cabeceras extra.
 */
export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

/**
 * Respuesta de error `application/problem+json`.
 *
 * @param status - Estado HTTP.
 * @param problem - Cuerpo del problema; si falta, uno mínimo con ese estado.
 * @param headers - Cabeceras extra (por ejemplo `Retry-After`).
 */
export function problemResponse(
  status: number,
  problem: unknown = { type: 'error', title: 'Error', status },
  headers: Record<string, string> = {},
): Response {
  return jsonResponse(problem, status, { 'Content-Type': 'application/problem+json', ...headers })
}
