import type { QueryClient } from '@tanstack/react-query'
import type { AdminSession, ApiClient } from '@galpon/api-client'
import { adminCsrfQuery, adminSessionQuery } from '@galpon/api-client/react'

/** Contexto que el router le da a cada ruta (`beforeLoad`, `loader` y componentes). */
export interface RouterContext {
  /** Caché de consultas de la app. */
  queryClient: QueryClient
  /** Cliente de la API: el simulado o el real, según el modo. */
  api: ApiClient
  /** Guarda (o borra con `undefined`) el token anti-CSRF que el cliente manda en las escrituras. */
  setCsrfToken: (token: string | undefined) => void
  /** Estado del modo de prueba, o `null` cuando la API es la real. */
  mockStatus: { isPersistent: boolean } | null
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
  return session
}
