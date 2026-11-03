import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteAdminCombo, isApiError } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { toast } from '../../components/ui/toast'
import { COMBOS_COPY } from './combos.copy'

/**
 * Mutación que borra un combo (`DELETE /admin/combos/{id}`); se llama con su id.
 *
 * Con éxito avisa "Combo borrado.". Si falla avisa el mensaje del servidor (o "No pudimos borrar
 * el combo. Probá de nuevo." sin respuesta); un `401` o un `403` los avisa la estructura del
 * dashboard. Al terminar invalida los combos sin esperar la recarga, así quien la usa puede cerrar
 * su diálogo antes de que la fila salga de la lista.
 *
 * @returns La mutación de TanStack Query.
 */
export function useDeleteCombo() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAdminCombo(api, id),
    onSuccess: () => {
      toast.success(COMBOS_COPY.remove.deleted)
    },
    onError: (error) => {
      if (!isApiError(error)) {
        toast.error(COMBOS_COPY.remove.error)
        return
      }
      if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
      toast.error(error.message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminCombos() })
    },
  })
}
