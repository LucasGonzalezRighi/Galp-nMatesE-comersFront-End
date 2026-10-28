import { useMutation, useQueryClient } from '@tanstack/react-query'
import { archiveAdminProduct, isApiError } from '@galpon/api-client'
import { useApiClient } from '@galpon/api-client/react'
import { toast } from '../../components/ui/toast'
import { refreshProductCaches } from './product-cache'
import { PRODUCTS_COPY } from './products.copy'

/**
 * Archiva un producto con `archiveAdminProduct`, dentro de `useMutation`.
 *
 * Con éxito actualiza el detalle e invalida la lista, las líneas y el resumen (el aviso lo da
 * quien llama). Un `401` o un `403` los maneja la estructura del admin; el resto va a un toast
 * con el `message` del servidor.
 *
 * @returns La mutación de React Query; `mutate` recibe el identificador del producto.
 */
export function useArchiveProduct() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveAdminProduct(api, id),
    onSuccess: (archived) => refreshProductCaches(queryClient, archived),
    onError: (error) => {
      if (!isApiError(error)) {
        toast.error(PRODUCTS_COPY.unexpectedError)
        return
      }
      if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
      toast.error(error.message)
    },
  })
}
