import { adminCsrfQuery, adminSessionQuery } from '@galpon/api-client/react'
import type { TestApp, TestAppOptions } from '../test/render'
import { useSessionExpiredStore } from '../features/auth'
import { createTestApp } from '../test/render'
import { createAdminQueryClient } from './query-client'

/**
 * Como `createTestApp`, pero con la caché de la app (`createAdminQueryClient`, con el manejo del
 * `401` y del `403`) y, si hay sesión, marcada como abierta en el store de la sesión vencida.
 *
 * @param options - Las mismas de `createTestApp`.
 * @returns La app del test, con `queryClient` y `context.queryClient` reemplazados.
 */
export async function createAdminTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  const base = await createTestApp(options)
  const queryClient = createAdminQueryClient({
    api: base.api,
    setCsrfToken: base.context.setCsrfToken,
  })
  const sessionKey = adminSessionQuery(base.api).queryKey
  const csrfKey = adminCsrfQuery(base.api).queryKey
  const session = base.queryClient.getQueryData(sessionKey)
  const csrf = base.queryClient.getQueryData(csrfKey)
  if (session !== undefined) queryClient.setQueryData(sessionKey, session)
  if (csrf !== undefined) queryClient.setQueryData(csrfKey, csrf)
  if (base.session !== null) useSessionExpiredStore.getState().markSessionStarted()
  return { ...base, queryClient, context: { ...base.context, queryClient } }
}
