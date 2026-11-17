import { adminLoginSchema, adminPasswordChangeSchema } from '@galpon/schemas'
import type { MockContext, MockRoute } from '../router'
import type { MockAdminSession } from '../types'
import { json, noContent, problem, ResponseError, validationProblem } from '../http'
import { route } from '../router'
import { MOCK_ADMIN_SESSION_COOKIE } from '../session-cookie'
import { randomUuid } from '../uuid'
import { parseOrFail, zodFieldErrors } from '../validation'
import { readCookie } from './customer-session'

/** Duración de la sesión del administrador: 8 horas. */
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000

/** Cabecera donde el admin manda el token anti-CSRF. */
const CSRF_HEADER = 'X-CSRF-Token'

/**
 * Indica si el pedido es de quien abrió la sesión: trae su cookie `galpon_admin`, como en el back.
 * Con `singleClient` (el dashboard, que corre la API simulada en su navegador y no puede mandarle
 * cookies a un `fetch` en memoria) la sesión abierta es la de su único cliente.
 */
function ownsSession(ctx: MockContext, session: MockAdminSession): boolean {
  return ctx.singleClient || readCookie(ctx.request, MOCK_ADMIN_SESSION_COOKIE) === session.id
}

/**
 * Agrega a una respuesta la cookie de la sesión del admin (`HttpOnly`, `SameSite=Lax`; sin `Secure`
 * porque el modo de prueba corre en `http://localhost`), o la borra.
 *
 * @param response - Respuesta a la que se le agrega la cookie.
 * @param session - Sesión abierta, o `null` para borrar la cookie.
 * @returns La misma respuesta.
 */
function withAdminCookie(response: Response, session: MockAdminSession | null): Response {
  const maxAge = session === null ? 0 : ADMIN_SESSION_MS / 1000
  response.headers.append(
    'Set-Cookie',
    `${MOCK_ADMIN_SESSION_COOKIE}=${session?.id ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${String(maxAge)}`,
  )
  return response
}

/**
 * Guardia de las rutas del admin: exige la cookie de una sesión abierta y no vencida.
 *
 * @param ctx - Contexto del pedido.
 * @param options - Con `csrf: true` (las escrituras) también exige que `X-CSRF-Token` sea el de
 *   la sesión.
 * @returns La sesión vigente.
 * @throws {ResponseError} Con `401` si no hay sesión, venció o el pedido no trae su cookie (otro
 *   ingreso la reemplazó), y con `403` `csrf_invalid` si falta el token CSRF o no coincide.
 */
export function requireAdmin(ctx: MockContext, options: { csrf: boolean }): MockAdminSession {
  const session = ctx.db.adminSession
  if (
    session === null ||
    !ownsSession(ctx, session) ||
    Date.parse(session.expiresAt) <= ctx.now.getTime()
  ) {
    throw new ResponseError(
      problem(401, 'Sesión requerida', { detail: 'Iniciá sesión para continuar.' }),
    )
  }
  if (options.csrf && ctx.request.headers.get(CSRF_HEADER) !== session.csrfToken) {
    throw new ResponseError(
      problem(403, 'Token CSRF inválido', {
        type: 'csrf_invalid',
        detail: 'El token CSRF falta o no es válido.',
      }),
    )
  }
  return session
}

/**
 * Rutas de la sesión del administrador: iniciar y cerrar sesión, consultarla, pedir el token CSRF y
 * cambiar la contraseña.
 */
export const adminAuthRoutes: readonly MockRoute[] = [
  route('POST', '/admin/auth/login', async (ctx) => {
    const result = adminLoginSchema.safeParse(await ctx.body())
    if (!result.success) return validationProblem(zodFieldErrors(result.error))
    const { adminAccount } = ctx.db
    if (
      result.data.email !== adminAccount.email.trim().toLowerCase() ||
      result.data.password !== adminAccount.password
    ) {
      return problem(401, 'Credenciales incorrectas', {
        type: 'invalid_credentials',
        detail: 'Email o contraseña incorrectos.',
      })
    }
    // Una sola sesión a la vez: un ingreso nuevo reemplaza la anterior y su cookie deja de servir.
    const session: MockAdminSession = {
      id: randomUuid(),
      email: adminAccount.email,
      csrfToken: randomUuid(),
      expiresAt: new Date(ctx.now.getTime() + ADMIN_SESSION_MS).toISOString(),
    }
    ctx.db.adminSession = session
    const { email, csrfToken, expiresAt } = session
    return withAdminCookie(json({ email, csrfToken, expiresAt }), session)
  }),

  route('POST', '/admin/auth/logout', (ctx) => {
    requireAdmin(ctx, { csrf: true })
    ctx.db.adminSession = null
    return withAdminCookie(noContent(), null)
  }),

  route('GET', '/admin/auth/me', (ctx) => {
    const { email, expiresAt } = requireAdmin(ctx, { csrf: false })
    return json({ email, expiresAt })
  }),

  route('GET', '/admin/auth/csrf', (ctx) => {
    const { csrfToken } = requireAdmin(ctx, { csrf: false })
    return json({ csrfToken })
  }),

  // Cambia la contraseña de la cuenta; la sesión abierta sigue valiendo.
  route('POST', '/admin/auth/password', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const input = parseOrFail(adminPasswordChangeSchema, await ctx.body())
    if (input.currentPassword !== ctx.db.adminAccount.password) {
      return validationProblem([
        {
          field: 'currentPassword',
          code: 'invalid_password',
          message: 'La contraseña actual no es correcta',
        },
      ])
    }
    ctx.db.adminAccount.password = input.newPassword
    return noContent()
  }),
]
