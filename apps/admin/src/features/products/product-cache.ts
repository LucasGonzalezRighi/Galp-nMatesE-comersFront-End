import type { QueryClient } from '@tanstack/react-query'
import type { AdminProduct } from '@galpon/api-client'
import { queryKeys } from '@galpon/api-client/react'

/**
 * Después de guardar o archivar un producto: deja la versión nueva en la caché de su detalle e
 * invalida la lista de productos, las líneas (su `productCount`) y el resumen (poco stock y los
 * contadores del menú).
 *
 * @param queryClient - Caché de consultas.
 * @param saved - El producto como lo devolvió la API.
 * @returns Se cumple cuando se recargaron las consultas activas.
 */
export async function refreshProductCaches(
  queryClient: QueryClient,
  saved: AdminProduct,
): Promise<void> {
  queryClient.setQueryData(queryKeys.adminProduct(saved.id), saved)
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.adminProductsAll() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard() }),
  ])
}
