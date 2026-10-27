'use client'
// El contexto es de cliente: con la directiva, un Server Component de la tienda puede importar
// el barril `./react` (por ejemplo para `queryKeys`) sin arrastrar `createContext` al servidor.
import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import type { ApiClient } from '../client'

/** Props de {@link ApiClientProvider}. */
export interface ApiClientProviderProps {
  /** Cliente que van a usar los componentes de adentro. */
  client: ApiClient
  /** Componentes que pueden llamar a {@link useApiClient}. */
  children: ReactNode
}

const ApiClientContext = createContext<ApiClient | null>(null)

/**
 * Pone el cliente de la API a disposición de los componentes de adentro.
 *
 * @param props - Ver {@link ApiClientProviderProps}.
 */
export function ApiClientProvider({ client, children }: ApiClientProviderProps): ReactNode {
  return <ApiClientContext value={client}>{children}</ApiClientContext>
}

/**
 * Devuelve el cliente de la API del {@link ApiClientProvider} más cercano.
 *
 * @throws {Error} Si el componente no está dentro de un `ApiClientProvider`.
 */
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext)
  if (client === null) {
    throw new Error(
      'useApiClient necesita <ApiClientProvider> más arriba en el árbol de componentes.',
    )
  }
  return client
}
