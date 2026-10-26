import type { MockContext } from '../router'
import type { MockCustomer, MockCustomerSession } from '../types'
import { problem, ResponseError } from '../http'
import { randomUuid } from '../uuid'

/**
 * Nombre de la cookie de sesión de la tienda en el modo de prueba. En vivo es
 * `__Host-galpon_session`, pero un navegador no acepta el prefijo `__Host-` en `http://localhost`.
 */
export const DEFAULT_CUSTOMER_SESSION_COOKIE = 'galpon_session'

/** Duración de la sesión de un cliente: 30 días. */
export const CUSTOMER_SESSION_MS = 30 * 24 * 60 * 60 * 1000

/** Duración de una sesión anónima, que solo sirve para el token CSRF: 1 día. */
const ANONYMOUS_SESSION_MS = 24 * 60 * 60 * 1000

/** Cabecera donde la tienda manda el token anti-CSRF. */
const CSRF_HEADER = 'X-CSRF-Token'

/** Lee el valor de una cookie del pedido, o `null` si no vino. */
function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') ?? ''
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim()
    }
  }
  return null
}

/** Indica si una sesión ya venció. */
function isExpired(session: MockCustomerSession, now: Date): boolean {
  return Date.parse(session.expiresAt) <= now.getTime()
}

/**
 * Sesión de la tienda que corresponde a la cookie del pedido.
 *
 * @param ctx - Contexto del pedido.
 * @returns La sesión vigente, o `null` si no hay cookie, no existe o venció.
 */
export function currentSession(ctx: MockContext): MockCustomerSession | null {
  const id = readCookie(ctx.request, ctx.customerSessionCookie)
  if (id === null) return null
  const session = ctx.db.customerSessions.find((candidate) => candidate.id === id)
  return session === undefined || isExpired(session, ctx.now) ? null : session
}

/**
 * Cliente con la sesión iniciada en el pedido.
 *
 * @param ctx - Contexto del pedido.
 * @returns El cliente, o `null` si no hay sesión o es anónima.
 */
export function currentCustomer(ctx: MockContext): MockCustomer | null {
  const customerId = currentSession(ctx)?.customerId
  return ctx.db.customers.find((customer) => customer.id === customerId) ?? null
}

/**
 * Abre una sesión nueva y descarta la del pedido y las vencidas: al iniciar o cerrar sesión la
 * cookie y el token CSRF cambian, así una cookie robada antes no sirve después.
 *
 * @param ctx - Contexto del pedido.
 * @param customerId - Cliente que inicia sesión, o `null` para una sesión anónima.
 * @returns La sesión nueva.
 */
export function startSession(ctx: MockContext, customerId: string | null): MockCustomerSession {
  const previous = currentSession(ctx)
  const ttl = customerId === null ? ANONYMOUS_SESSION_MS : CUSTOMER_SESSION_MS
  const session: MockCustomerSession = {
    id: randomUuid(),
    customerId,
    csrfToken: randomUuid(),
    expiresAt: new Date(ctx.now.getTime() + ttl).toISOString(),
  }
  ctx.db.customerSessions = [
    ...ctx.db.customerSessions.filter(
      (candidate) => candidate !== previous && !isExpired(candidate, ctx.now),
    ),
    session,
  ]
  return session
}

/**
 * Cierra la sesión del pedido.
 *
 * @param ctx - Contexto del pedido.
 * @param session - Sesión a descartar.
 */
export function endSession(ctx: MockContext, session: MockCustomerSession): void {
  ctx.db.customerSessions = ctx.db.customerSessions.filter((candidate) => candidate !== session)
}

/**
 * Agrega a una respuesta la cookie de sesión (`HttpOnly`, `SameSite=Lax`, sin `Secure` porque el
 * modo de prueba corre en `http://localhost`).
 *
 * @param ctx - Contexto del pedido.
 * @param response - Respuesta a la que se le agrega la cookie.
 * @param session - Sesión abierta, o `null` para borrar la cookie.
 * @returns La misma respuesta.
 */
export function withSessionCookie(
  ctx: MockContext,
  response: Response,
  session: MockCustomerSession | null,
): Response {
  const value = session?.id ?? ''
  const maxAge =
    session === null
      ? 0
      : Math.max(0, Math.floor((Date.parse(session.expiresAt) - ctx.now.getTime()) / 1000))
  response.headers.append(
    'Set-Cookie',
    `${ctx.customerSessionCookie}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${String(maxAge)}`,
  )
  return response
}

/** Error `403` del token CSRF. */
function csrfProblem(): ResponseError {
  return new ResponseError(
    problem(403, 'Acceso denegado', { detail: 'El token CSRF falta o no es válido.' }),
  )
}

/**
 * Guardia de las escrituras con token CSRF y sin sesión de cliente (registro, inicio de sesión y
 * contraseña): exige que `X-CSRF-Token` sea el de la sesión de la cookie, aunque sea anónima.
 *
 * @param ctx - Contexto del pedido.
 * @returns La sesión de la cookie.
 * @throws {ResponseError} Con `403` si no hay sesión o el token falta o no coincide.
 */
export function requireCsrf(ctx: MockContext): MockCustomerSession {
  const session = currentSession(ctx)
  if (ctx.request.headers.get(CSRF_HEADER) !== session?.csrfToken) {
    throw csrfProblem()
  }
  return session
}

/**
 * Guardia de las rutas de la cuenta: exige la sesión de un cliente.
 *
 * @param ctx - Contexto del pedido.
 * @param options - Con `csrf: true` (las escrituras) también exige el token CSRF de la sesión.
 * @returns La sesión y su cliente.
 * @throws {ResponseError} Con `401` si no hay sesión de cliente y con `403` si el token CSRF
 *   falta o no coincide.
 */
export function requireCustomer(
  ctx: MockContext,
  options: { csrf: boolean },
): { session: MockCustomerSession; customer: MockCustomer } {
  const session = currentSession(ctx)
  const customer = ctx.db.customers.find((candidate) => candidate.id === session?.customerId)
  if (session === null || customer === undefined) {
    throw new ResponseError(
      problem(401, 'Sesión requerida', { detail: 'Iniciá sesión para continuar.' }),
    )
  }
  if (options.csrf && ctx.request.headers.get(CSRF_HEADER) !== session.csrfToken) {
    throw csrfProblem()
  }
  return { session, customer }
}
