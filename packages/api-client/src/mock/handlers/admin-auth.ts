import { adminLoginSchema, adminPasswordChangeSchema } from '@galpon/schemas'
import type { MockContext, MockRoute } from '../router'
import type { MockAdminSession } from '../types'
import { json, noContent, problem, ResponseError, validationProblem } from '../http'
import { route } from '../router'
import { randomUuid } from '../uuid'
import { parseOrFail, zodFieldErrors } from '../validation'

/** Duración de la sesión del administrador: 8 horas. */
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000

/** Cabecera donde el admin manda el token anti-CSRF. */
const CSRF_HEADER = 'X-CSRF-Token'

/**
 * Guardia de las rutas del admin: exige una sesión abierta y no vencida.
 *
 * @param ctx - Contexto del pedido.
 * @param options - Con `csrf: true` (las escrituras) también exige que `X-CSRF-Token` sea el de
 *   la sesión.
 * @returns La sesión vigente.
 * @throws {ResponseError} Con `401` si no hay sesión o venció, y con `403` `csrf_invalid` si falta
 *   el token CSRF o no coincide (por ejemplo, porque otro inicio de sesión lo rotó).
 */
export function requireAdmin(ctx: MockContext, options: { csrf: boolean }): MockAdminSession {
  const session = ctx.db.adminSession
  if (session === null || Date.parse(session.expiresAt) <= ctx.now.getTime()) {
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
    const session: MockAdminSession = {
      email: adminAccount.email,
      csrfToken: randomUuid(),
      expiresAt: new Date(ctx.now.getTime() + ADMIN_SESSION_MS).toISOString(),
    }
    ctx.db.adminSession = session
    return json(session)
  }),

  route('POST', '/admin/auth/logout', (ctx) => {
    requireAdmin(ctx, { csrf: true })
    ctx.db.adminSession = null
    return noContent()
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
