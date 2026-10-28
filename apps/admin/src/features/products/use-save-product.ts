import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AdminProduct, AdminProductInput } from '@galpon/api-client'
import { createAdminProduct, updateAdminProduct } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { refreshProductCaches } from './product-cache'
import { republishInput } from './product-form-values'

/**
 * Guarda el formulario de producto, dentro de `useMutation`: crea con `createAdminProduct` o
 * guarda los cambios con `updateAdminProduct` (el cuerpo trae `expectedUpdatedAt` si corresponde).
 * Con éxito actualiza el detalle e invalida la lista, las líneas y el resumen. Los errores los
 * maneja quien llama (`mutate(…, { onError })`): cada uno va a un lugar distinto del formulario.
 *
 * @param productId - Producto que se edita, o `null` para crear uno.
 * @returns La mutación de React Query; `mutate` recibe el cuerpo de la API.
 */
export function useSaveProduct(productId: string | null) {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminProductInput) =>
      productId === null
        ? createAdminProduct(api, input)
        : updateAdminProduct(api, productId, input),
    onSuccess: (saved) => refreshProductCaches(queryClient, saved),
  })
}

/** Lo que recibe `mutate` de {@link useRepublishProduct}. */
export interface RepublishRequest {
  /** El producto archivado, como está guardado. */
  product: AdminProduct
  /** `updatedAt` de la versión que muestra la pantalla. */
  expectedUpdatedAt: string
}

/**
 * Vuelve a publicar un producto archivado: `PATCH` con lo guardado y `status: 'published'`
 * (`republishInput`). Con éxito actualiza el detalle e invalida la lista, las líneas y el resumen.
 *
 * @returns La mutación de React Query.
 */
export function useRepublishProduct() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ product, expectedUpdatedAt }: RepublishRequest) =>
      updateAdminProduct(api, product.id, republishInput(product, expectedUpdatedAt)),
    onSuccess: (saved) => refreshProductCaches(queryClient, saved),
  })
}
