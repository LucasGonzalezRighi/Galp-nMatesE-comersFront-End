'use client'

import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { getBrowserApi } from '@/lib/api.browser'
import { ApiClientProvider, shouldRetryQuery } from '@galpon/api-client/react'

/** Props de {@link Providers}. */
export interface ProvidersProps {
  /** El árbol de la tienda. */
  children: ReactNode
}

/**
 * Proveedores del lado del cliente: TanStack Query y el cliente de la API del navegador
 * (`/api/v1` del mismo dominio). Las consultas se reintentan solo ante errores de red o de
 * servidor, y los datos se consideran frescos por un minuto.
 *
 * @param props - Ver {@link ProvidersProps}.
 */
export function Providers({ children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: shouldRetryQuery, staleTime: 60_000 } },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={getBrowserApi()}>{children}</ApiClientProvider>
    </QueryClientProvider>
  )
}
