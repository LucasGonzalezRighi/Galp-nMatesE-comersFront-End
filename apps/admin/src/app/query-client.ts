import { hashKey, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import type { ApiClient } from '@galpon/api-client'
import { isApiError } from '@galpon/api-client'
import { adminCsrfQuery, queryKeys, shouldRetryQuery } from '@galpon/api-client/react'
import { toast } from '../components/ui/toast'
import { useSessionExpiredStore } from '../features/auth'
import { APP_COPY } from './app.copy'

/** Cuánto tiempo se dan por frescos los datos antes de volver a pedirlos (30 s). */
const STALE_TIME_MS = 30_000

/** Opciones de {@link createAdminQueryClient}. */
export interface AdminQueryClientOptions {
  /** Cliente de la API, para volver a pedir el token anti-CSRF. */
  api: ApiClient
  /** Le pasa al cliente el token anti-CSRF nuevo. */
  setCsrfToken: (token: string | undefined) => void
}

/** Abre "Tu sesión venció" (si hay una sesión abierta; si no, no hace nada). */
function markSessionExpired(): void {
  useSessionExpiredStore.getState().markSessionExpired()
}

/**
 * Crea la caché de consultas del dashboard.
 *
 * Reintenta solo los errores de red y de servidor (`shouldRetryQuery`) y da los datos por frescos
 * 30 s. Además centraliza dos errores de la API, para que las features no los atrapen:
 * - **`401` con una sesión abierta** (de una consulta que no sea la de la sesión ni la del CSRF, o
 *   de una escritura): abre "Tu sesión venció" sin salir de la pantalla (Ruling P4-3).
 * - **`403` en una escritura** (el token CSRF se rotó, por ejemplo por otro ingreso): vuelve a pedir
 *   el token sin caché, se lo pasa al cliente y avisa "Actualizamos tu sesión. Probá de nuevo."; no
 *   reintenta solo, porque repetir una escritura podría duplicar su efecto. Si ese pedido da `401`,
 *   abre el diálogo.
 *
 * @param options - Ver {@link AdminQueryClientOptions}.
 * @returns La caché, para el `QueryClientProvider` y el contexto del router.
 */
export function createAdminQueryClient({
  api,
  setCsrfToken,
}: AdminQueryClientOptions): QueryClient {
  const sessionHashes = new Set([hashKey(queryKeys.adminSession()), hashKey(queryKeys.adminCsrf())])

  async function refreshCsrfToken(): Promise<void> {
    try {
      const { csrfToken } = await queryClient.query({ ...adminCsrfQuery(api), staleTime: 0 })
      setCsrfToken(csrfToken)
      toast.error(APP_COPY.csrfRefreshed)
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') markSessionExpired()
      // Con otro error (red, servidor) no hay nada que agregar: la pantalla ya avisó que falló.
    }
  }

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (!isApiError(error) || error.kind !== 'unauthorized') return
        // La sesión y el CSRF los consulta `ensureAdminSession`: su 401 lo resuelve la navegación.
        if (!sessionHashes.has(query.queryHash)) markSessionExpired()
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (!isApiError(error)) return
        if (error.kind === 'unauthorized') markSessionExpired()
        if (error.kind === 'forbidden') void refreshCsrfToken()
      },
    }),
    defaultOptions: { queries: { retry: shouldRetryQuery, staleTime: STALE_TIME_MS } },
  })
  return queryClient
}
