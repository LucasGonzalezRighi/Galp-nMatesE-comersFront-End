import { queryOptions } from '@tanstack/react-query'
import type { ApiClient } from '@galpon/api-client'
import { listAllProducts, listCategories } from '@galpon/api-client'
import { queryKeys } from '@galpon/api-client/react'

/** Cuánto se considera fresco el catálogo del buscador: 5 minutos, para no pedirlo en cada apertura. */
const SEARCH_STALE_MS = 5 * 60_000

/**
 * Consulta del catálogo publicado completo, sobre el que busca el modal. Se pide al abrir el
 * buscador por primera vez y se reutiliza después.
 *
 * @param api - Cliente de la API del navegador.
 */
export function searchCatalogQuery(api: ApiClient) {
  return queryOptions({
    queryKey: ['search', 'catalog'] as const,
    queryFn: () => listAllProducts(api),
    staleTime: SEARCH_STALE_MS,
  })
}

/**
 * Consulta de las líneas de producto, que el buscador muestra con el campo vacío.
 *
 * @param api - Cliente de la API del navegador.
 */
export function searchLinesQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.categories(),
    queryFn: () => listCategories(api),
    staleTime: SEARCH_STALE_MS,
  })
}
