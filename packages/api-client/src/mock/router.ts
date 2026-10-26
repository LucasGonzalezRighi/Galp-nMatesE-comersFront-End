import type { paths } from '../generated/schema'
import type { HttpMethod } from './http'
import type { MockDb } from './types'
import { isHttpMethod } from './http'

/** Lo que recibe cada handler de la API simulada. */
export interface MockContext {
  /** El pedido original. */
  request: Request
  /** Parámetros de la ruta, ya decodificados (`{ slug: 'mate-galleta' }`). */
  params: Readonly<Record<string, string>>
  /** Parámetros de búsqueda de la URL. */
  query: URLSearchParams
  /** Base simulada del pedido; los handlers la leen y la modifican directamente. */
  db: MockDb
  /** Momento del pedido, para vencimientos y fechas de alta. */
  now: Date
  /** Nombre de la cookie de sesión de la tienda (`galpon_session` por omisión). */
  customerSessionCookie: string
  /**
   * Lee el cuerpo como JSON.
   *
   * @throws {ResponseError} Con un `422` si el cuerpo no es JSON válido.
   */
  body<T>(): Promise<T>
  /**
   * Avisa que cambió algo que la tienda tiene guardado en caché (`products`, `categories`…).
   *
   * @param tags - Etiquetas de caché a invalidar.
   */
  invalidate(tags: readonly string[]): void
}

/** Función que atiende una ruta de la API simulada. */
export type MockHandler = (ctx: MockContext) => Response | Promise<Response>

/** Una operación del contrato atendida por la API simulada. */
export interface MockRoute {
  /** Método HTTP. */
  method: HttpMethod
  /** Ruta del contrato, con los parámetros entre llaves (`/products/{slug}`). */
  path: string
  /** Quien la atiende. */
  handler: MockHandler
}

/** Resultado de encontrar la ruta de un pedido. */
export interface RouteMatch {
  /** La ruta elegida. */
  route: MockRoute
  /** Parámetros de la ruta, decodificados. */
  params: Record<string, string>
}

/**
 * Arma una ruta; el `path` se chequea contra el contrato en tiempo de compilación.
 *
 * @param method - Método HTTP.
 * @param path - Ruta tal como está en `docs/api/openapi.yaml`.
 * @param handler - Quien atiende el pedido.
 * @throws {RangeError} Si el método no es HTTP del contrato.
 */
export function route(method: HttpMethod, path: keyof paths, handler: MockHandler): MockRoute {
  if (!isHttpMethod(method)) {
    throw new RangeError(
      `El método "${String(method)}" no es uno de GET, POST, PUT, PATCH o DELETE.`,
    )
  }
  return { method, path, handler }
}

/** Separa una ruta en segmentos, sin la barra final; `null` si algún segmento está vacío. */
function segmentsOf(pathname: string): string[] | null {
  const trimmed = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  const segments = trimmed.slice(1).split('/')
  return segments.some((segment) => segment === '') ? null : segments
}

/** Decodifica un segmento de la URL; `null` si el porcentaje está mal formado. */
function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/** Compara la ruta de un pedido con la de una ruta del contrato; `null` si no coinciden. */
function matchPath(pattern: string, segments: readonly string[]): Record<string, string> | null {
  const patternSegments = pattern.slice(1).split('/')
  if (patternSegments.length !== segments.length) return null
  const params: Record<string, string> = {}
  for (const [index, patternSegment] of patternSegments.entries()) {
    const segment = segments[index]
    if (segment === undefined) return null
    if (patternSegment.startsWith('{') && patternSegment.endsWith('}')) {
      const value = decode(segment)
      if (value === null) return null
      params[patternSegment.slice(1, -1)] = value
    } else if (patternSegment !== segment) {
      return null
    }
  }
  return params
}

/**
 * Busca la ruta que atiende un pedido.
 *
 * Si varias tienen la misma forma gana la que menos parámetros tiene: `/admin/categories/order`
 * es la ruta literal, no la de `/admin/categories/{id}`. Un segmento vacío o con un `%` mal
 * formado no coincide con ninguna.
 *
 * @param routes - Rutas disponibles.
 * @param method - Método del pedido.
 * @param pathname - Ruta del pedido, sin prefijo de la API ni query, que empieza con `/`.
 * @returns La ruta con sus parámetros; `'method_not_allowed'` si la ruta existe pero no para ese
 *   método; `null` si ninguna ruta tiene esa forma.
 * @throws {RangeError} Si `pathname` no empieza con `/`.
 */
export function matchRoute(
  routes: readonly MockRoute[],
  method: HttpMethod,
  pathname: string,
): RouteMatch | 'method_not_allowed' | null {
  if (!pathname.startsWith('/')) {
    throw new RangeError(
      `La ruta tiene que empezar con "/"; se recibió ${JSON.stringify(pathname)}.`,
    )
  }
  const segments = segmentsOf(pathname)
  if (segments === null) return null
  let best: RouteMatch | null = null
  let sameShape = false
  for (const candidate of routes) {
    const params = matchPath(candidate.path, segments)
    if (params === null) continue
    sameShape = true
    if (candidate.method !== method) continue
    if (best === null || Object.keys(params).length < Object.keys(best.params).length) {
      best = { route: candidate, params }
    }
  }
  if (best !== null) return best
  return sameShape ? 'method_not_allowed' : null
}
