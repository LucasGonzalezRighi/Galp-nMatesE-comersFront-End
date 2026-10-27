import type { ApiFetch } from '../client'
import type { MockRoute } from './router'
import type { MockDb } from './types'
import { IMPLEMENTED_ROUTES } from './handlers'
import { DEFAULT_CUSTOMER_SESSION_COOKIE } from './handlers/customer-session'
import { INTERNAL_ROUTES } from './handlers/mercadopago-simulator'
import { MOCK_CONTROL_ROUTES } from './handlers/mock-controls'
import { isHttpMethod, notFound, problem, ResponseError } from './http'
import { PENDING_OPERATIONS } from './pending'
import { matchRoute } from './router'

/** Latencia por omisión: se sortea entre 150 y 400 ms, como una API real. */
const DEFAULT_LATENCY_MS = [150, 400] as const

/** Prefijos por omisión: el de la tienda en modo de prueba y el del rewrite hacia el backend. */
const DEFAULT_BASE_PATHS = ['/api/mock/v1', '/api/v1'] as const

/** Opciones de {@link createMockFetch}. */
export interface MockFetchOptions {
  /** Devuelve la base simulada; se llama en cada pedido. */
  getDb: () => MockDb
  /**
   * Demora antes de responder, en milisegundos: un número fijo o un rango `[mínimo, máximo]` del
   * que se sortea cada vez. Por omisión `[150, 400]`; `0` responde sin esperar.
   */
  latencyMs?: number | readonly [number, number]
  /** Reloj; por omisión la hora actual. Los tests lo fijan para probar vencimientos. */
  now?: () => Date
  /** Prefijos de la API que se quitan de la ruta; por omisión `/api/mock/v1` y `/api/v1`. */
  basePaths?: readonly string[]
  /** Se llama cuando un handler avisa que cambiaron datos con caché (por ejemplo `products`). */
  onInvalidate?: (tags: readonly string[]) => void
  /** Se llama después de cada pedido que no es `GET` y responde 2xx (por ejemplo, para guardar la base). */
  onMutation?: () => void
  /**
   * Nombre de la cookie de sesión de la tienda; por omisión `galpon_session`. En vivo el back usa
   * `__Host-galpon_session`, que un navegador no acepta en `http://localhost`.
   */
  customerSessionCookie?: string
}

/**
 * Rutas atendidas: las implementadas, las internas del modo de prueba (el simulador de Mercado
 * Pago y los controles de escenarios, fuera del contrato) y las pendientes, que responden 501 con
 * su plan.
 */
const ALL_ROUTES: readonly MockRoute[] = [
  ...IMPLEMENTED_ROUTES,
  ...INTERNAL_ROUTES,
  ...MOCK_CONTROL_ROUTES,
  ...PENDING_OPERATIONS.map(({ method, path, plan }) => ({
    method,
    path,
    handler: () =>
      problem(501, 'No implementado en el modo de prueba', {
        detail: `Llega en ${plan}`,
        type: 'not_implemented',
      }),
  })),
]

/** Valida la latencia y la devuelve como rango. */
function parseLatency(latencyMs: number | readonly [number, number]): readonly [number, number] {
  const [min, max] = typeof latencyMs === 'number' ? [latencyMs, latencyMs] : latencyMs
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    throw new RangeError(
      'latencyMs tiene que ser un número mayor o igual a 0, o un rango [mínimo, máximo] ordenado.',
    )
  }
  return [min, max]
}

/** Valida los prefijos de la API y los ordena del más largo al más corto. */
function parseBasePaths(basePaths: readonly string[]): string[] {
  if (basePaths.length === 0) {
    throw new RangeError('basePaths necesita al menos un prefijo.')
  }
  return basePaths
    .map((basePath) => {
      const normalized = basePath.replace(/\/+$/, '')
      if (!normalized.startsWith('/')) {
        throw new RangeError(
          `Cada prefijo de basePaths tiene que empezar con "/" y no ser solo "/"; se recibió ${JSON.stringify(basePath)}.`,
        )
      }
      return normalized
    })
    .sort((a, b) => b.length - a.length)
}

/** Quita el prefijo de la API de la ruta; `null` si la ruta no está bajo ninguno. */
function stripBasePath(pathname: string, basePaths: readonly string[]): string | null {
  for (const basePath of basePaths) {
    if (pathname === basePath) return '/'
    if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length)
  }
  return null
}

/** Caracteres que admite el nombre de una cookie (`token` de RFC 9110). */
const COOKIE_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/** Valida el nombre de la cookie de sesión. */
function parseCookieName(name: string): string {
  if (!COOKIE_NAME_PATTERN.test(name)) {
    throw new RangeError(
      `customerSessionCookie tiene que ser un nombre de cookie válido; se recibió ${JSON.stringify(name)}.`,
    )
  }
  return name
}

/** Espera `ms` milisegundos; con 0 no usa temporizadores. */
async function wait(ms: number): Promise<void> {
  if (ms <= 0) return
  await new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * Crea un `fetch` que responde con la API simulada en memoria, sin red.
 *
 * Quita el prefijo de la API, busca la ruta (las del contrato que todavía no existen responden
 * `501`), corre el handler contra la base de `getDb()` y devuelve su respuesta. Un handler que
 * falla responde `500` en vez de lanzar, como un servidor real.
 *
 * @param options - Ver {@link MockFetchOptions}.
 * @returns Un {@link ApiFetch} para `createApiClient({ fetch })`.
 * @throws {RangeError} Si `latencyMs`, `basePaths` o `customerSessionCookie` no sirven.
 */
export function createMockFetch(options: MockFetchOptions): ApiFetch {
  const [minLatency, maxLatency] = parseLatency(options.latencyMs ?? DEFAULT_LATENCY_MS)
  const basePaths = parseBasePaths(options.basePaths ?? DEFAULT_BASE_PATHS)
  const now = options.now ?? (() => new Date())
  const customerSessionCookie = parseCookieName(
    options.customerSessionCookie ?? DEFAULT_CUSTOMER_SESSION_COOKIE,
  )

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const pathname = stripBasePath(url.pathname, basePaths)
    if (pathname === null) return notFound(`No existe la ruta ${url.pathname}.`)
    const method = request.method.toUpperCase()
    const match = isHttpMethod(method)
      ? matchRoute(ALL_ROUTES, method, pathname)
      : 'method_not_allowed'
    if (match === null) return notFound(`No existe la ruta ${pathname}.`)
    if (match === 'method_not_allowed') {
      return problem(405, 'Método no permitido', {
        detail: `La ruta ${pathname} no admite ${method}.`,
      })
    }
    try {
      return await match.route.handler({
        request,
        params: match.params,
        query: url.searchParams,
        db: options.getDb(),
        now: now(),
        customerSessionCookie,
        body: async <T>() => {
          try {
            return (await request.json()) as T
          } catch {
            throw new ResponseError(
              problem(422, 'Los datos no son válidos', {
                detail: 'El cuerpo del pedido no es un JSON válido.',
              }),
            )
          }
        },
        invalidate: (tags) => options.onInvalidate?.(tags),
      })
    } catch (error) {
      if (error instanceof ResponseError) return error.response
      return problem(500, 'Error del servidor', {
        detail: error instanceof Error ? error.message : 'Falló la API simulada.',
      })
    }
  }

  return async (request) => {
    // Sin rango no se toca `Math.random()`: Next lo marca como valor inestable al prerenderizar.
    const jitter = maxLatency > minLatency ? Math.random() * (maxLatency - minLatency) : 0
    await wait(Math.round(minLatency + jitter))
    const response = await handle(request)
    if (request.method.toUpperCase() !== 'GET' && response.ok) options.onMutation?.()
    return response
  }
}
