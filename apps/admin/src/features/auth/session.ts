import type { QueryClient } from '@tanstack/react-query'
import type { AdminLoginResult, AdminSession, ApiClient } from '@galpon/api-client'
import { adminCsrfQuery, adminSessionQuery } from '@galpon/api-client/react'
import type { MockStatus, RegisterMockImage } from '../../lib/api'
import type { AdminEnv } from '../../lib/env'
import { useSessionExpiredStore } from './session-expired.store'

/** Contexto que el router le da a cada ruta (`beforeLoad`, `loader` y componentes). */
export interface RouterContext {
  /** Caché de consultas de la app. */
  queryClient: QueryClient
  /** Cliente de la API: el simulado o el real, según el modo. */
  api: ApiClient
  /** `mock` trabaja sin backend; `live` llama a la API real. Decide, por ejemplo, cómo se suben las fotos. */
  apiMode: AdminEnv['apiMode']
  /** URL de la tienda, sin barra final: el dashboard enlaza a ella (ver un producto, el sitio). */
  storeUrl: string
  /** Guarda (o borra con `undefined`) el token anti-CSRF que el cliente manda en las escrituras. */
  setCsrfToken: (token: string | undefined) => void
  /** Estado del modo de prueba, o `null` cuando la API es la real. */
  mockStatus: MockStatus | null
  /** En modo de prueba registra una foto reducida en la base simulada; en vivo es `null`. */
  registerMockImage: RegisterMockImage | null
}

/**
 * Se asegura de que haya una sesión abierta y deja listo el token anti-CSRF.
 *
 * Consulta la sesión y el token (desde la caché si ya los tiene) y le pasa el token al cliente
 * con `setCsrfToken`, así las escrituras siguientes lo mandan también después de recargar.
 *
 * @param context - El contexto del router.
 * @returns La sesión vigente.
 * @throws {ApiError} Con `kind: 'unauthorized'` si no hay sesión (la ruta decide redirigir al
 *   login), o con el error de red o del servidor que haya ocurrido.
 */
export async function ensureAdminSession(context: RouterContext): Promise<AdminSession> {
  // `staleTime: 'static'` devuelve lo que ya está en la caché y solo consulta si no hay nada.
  const session = await context.queryClient.query({
    ...adminSessionQuery(context.api),
    staleTime: 'static',
  })
  const { csrfToken } = await context.queryClient.query({
    ...adminCsrfQuery(context.api),
    staleTime: 'static',
  })
  context.setCsrfToken(csrfToken)
  // Solo la primera vez: si la sesión ya venció en esta pestaña, el aviso sigue abierto hasta
  // que se vuelva a entrar (una sesión en la caché no prueba que siga viva en el servidor).
  const store = useSessionExpiredStore.getState()
  if (!store.hasSession) store.markSessionStarted()
  return session
}

/** Lo que necesita {@link storeAdminSession} del contexto del router. */
export type SessionContext = Pick<RouterContext, 'api' | 'queryClient' | 'setCsrfToken'>

/**
 * Guarda la sesión recién abierta (en `/login` o en "Tu sesión venció"): le pasa el token
 * anti-CSRF al cliente, deja la sesión y el token en la caché (así `ensureAdminSession` no los
 * vuelve a pedir) y marca la sesión abierta, lo que cierra el aviso de vencida.
 *
 * @param context - `api`, `queryClient` y `setCsrfToken` del contexto del router.
 * @param result - Lo que devolvió `adminLogin`.
 * @throws {RangeError} Si el resultado no trae el token anti-CSRF.
 */
export function storeAdminSession(context: SessionContext, result: AdminLoginResult): void {
  if (result.csrfToken.trim() === '') {
    throw new RangeError('El ingreso no devolvió el token anti-CSRF de la sesión.')
  }
  context.setCsrfToken(result.csrfToken)
  context.queryClient.setQueryData(adminSessionQuery(context.api).queryKey, {
    email: result.email,
    expiresAt: result.expiresAt,
  })
  context.queryClient.setQueryData(adminCsrfQuery(context.api).queryKey, {
    csrfToken: result.csrfToken,
  })
  useSessionExpiredStore.getState().markSessionStarted()
}
