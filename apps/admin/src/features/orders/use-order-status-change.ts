import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrderStatusChange } from '@galpon/api-client'
import { changeOrderStatus, isApiError } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { isOrderNumber } from '@galpon/domain'
import { toast } from '../../components/ui/toast'
import { ORDERS_COPY } from './orders.copy'

/**
 * Cambia el estado de un pedido con `changeOrderStatus`, dentro de `useMutation`.
 *
 * - Con éxito invalida el pedido, la lista y el resumen (el contador "para despachar") y espera
 *   a que se recarguen, así los botones siguen deshabilitados hasta ver el estado nuevo.
 * - Un `409` (`invalid_status_transition` o `payment_in_progress`: por ejemplo, otra pestaña ya
 *   lo despachó) muestra un toast con el `message` del servidor y recarga el pedido.
 * - Un `401` o un `403` los maneja la estructura (diálogo de re-ingreso o CSRF renovado); un
 *   `422` con errores por campo lo pone en cada campo quien llama; el resto va a un toast.
 *
 * Quien llama agrega su `onSuccess` (el aviso y cerrar el diálogo) y su `onError` en `mutate`.
 *
 * @param number - Número del pedido.
 * @returns La mutación de React Query.
 * @throws {RangeError} Si el número no tiene el formato `GLP-` y cinco dígitos.
 */
export function useOrderStatusChange(number: string) {
  if (!isOrderNumber(number)) {
    throw new RangeError(`El número de pedido no es válido: "${number}".`)
  }
  const api = useApiClient()
  const queryClient = useQueryClient()

  function refresh() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrder(number) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrdersAll() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard() }),
    ])
  }

  return useMutation({
    mutationFn: (change: OrderStatusChange) => changeOrderStatus(api, number, change),
    onSuccess: refresh,
    onError: (error) => {
      if (!isApiError(error)) {
        toast.error(ORDERS_COPY.actions.unexpectedError)
        return
      }
      if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
      if (error.kind === 'validation' && Object.keys(error.fieldErrors).length > 0) return
      toast.error(error.message)
      if (error.kind === 'conflict') void refresh()
    },
  })
}
