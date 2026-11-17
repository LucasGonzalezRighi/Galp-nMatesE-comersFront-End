import { randomBytes } from 'node:crypto'
import type { MockPasswordResetMail } from '@galpon/api-client/mock'
import type { StoreEnv } from './env'
import { secretMatches } from './secret'

/**
 * Cabecera con el secreto de los controles de escenarios de la API simulada
 * (`POST /api/v1/__mock/orders/{number}/expire` y `POST /api/v1/__mock/products/{id}`).
 */
export const MOCK_CONTROL_SECRET_HEADER = 'x-mock-control-secret'

/**
 * Decide si un pedido puede usar los controles de escenarios de la API simulada: fuera de
 * producción, siempre (se desarrolla y se prueba a mano); en producción, solo con
 * `MOCK_CONTROL_SECRET` definida y ese mismo secreto en {@link MOCK_CONTROL_SECRET_HEADER} (las
 * pruebas de punta a punta, que corren la tienda compilada).
 *
 * @param env - `mockInProduction` y `mockControlSecret` de la configuración.
 * @param request - Pedido al control.
 * @returns `true` si el control puede responder; si no, la API simulada responde `404`.
 */
export function allowsMockControls(
  env: Pick<StoreEnv, 'mockControlSecret' | 'mockInProduction'>,
  request: Request,
): boolean {
  if (!env.mockInProduction) return true
  return (
    env.mockControlSecret !== null &&
    secretMatches(request.headers.get(MOCK_CONTROL_SECRET_HEADER), env.mockControlSecret)
  )
}

/**
 * Contraseña con la que se siembra el admin de la API simulada de la tienda: la de
 * `MOCK_ADMIN_PASSWORD` si se definió; si no, la de fábrica (publicada en el README) solo fuera de
 * producción. En producción sin la variable el admin queda cerrado: la contraseña es una al azar
 * que no se muestra en ningún lado.
 *
 * @param env - `mockAdminPassword` y `mockInProduction` de la configuración.
 * @param factoryPassword - La de fábrica (`DEFAULT_MOCK_DB_OPTIONS.adminPassword`).
 */
export function storeMockAdminPassword(
  env: Pick<StoreEnv, 'mockAdminPassword' | 'mockInProduction'>,
  factoryPassword: string,
): string {
  if (env.mockAdminPassword !== null) return env.mockAdminPassword
  return env.mockInProduction ? randomBytes(32).toString('hex') : factoryPassword
}

/**
 * Línea del log del servidor con el enlace para cambiar la contraseña: en modo de prueba no se
 * mandan mails y el log hace las veces del mail.
 *
 * @param siteUrl - Origen de la tienda (`NEXT_PUBLIC_SITE_URL`).
 * @param mail - A quién va, el token del enlace y su vencimiento.
 */
export function passwordResetNotice(siteUrl: string, mail: MockPasswordResetMail): string {
  const link = `${siteUrl}/cuenta/restablecer?token=${encodeURIComponent(mail.token)}`
  return `[modo de prueba] Enlace para cambiar la contraseña de ${mail.email} (vence ${mail.expiresAt}): ${link}`
}
