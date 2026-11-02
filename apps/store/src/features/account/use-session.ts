'use client'

import { useQuery } from '@tanstack/react-query'
import type { Customer } from '@galpon/api-client'
import { isApiError } from '@galpon/api-client'
import { meQuery, useApiClient } from '@galpon/api-client/react'

/**
 * Estado de la sesión del cliente: `loading` mientras se consulta, `authenticated` con sesión,
 * `anonymous` sin sesión (la API respondió `401`) y `error` si no se pudo saber (red, servidor).
 */
export type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'error'

/** Sesión del cliente, según `GET /me`. */
export interface Session {
  /** Estado de la sesión. */
  status: SessionStatus
  /** Datos del cliente con la sesión iniciada, o `null` si no hay (o todavía no se sabe). */
  customer: Customer | null
}

/**
 * Sesión del cliente de la tienda, con TanStack Query sobre `GET /me` (`queryKeys.me()`). Un
 * `401` no es un error: significa que no hay sesión. Después de iniciar o cerrar sesión,
 * `resetAccountState` hace que se vuelva a consultar.
 *
 * Tiene que estar dentro de un `ApiClientProvider` y de un `QueryClientProvider`.
 */
export function useSession(): Session {
  const api = useApiClient()
  const { data, error } = useQuery(meQuery(api))
  if (isApiError(error) && error.kind === 'unauthorized') {
    return { status: 'anonymous', customer: null }
  }
  if (data !== undefined) return { status: 'authenticated', customer: data }
  return { status: error === null ? 'loading' : 'error', customer: null }
}
