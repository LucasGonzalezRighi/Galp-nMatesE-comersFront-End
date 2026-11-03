import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Combo } from '@galpon/api-client'
import { isApiError, reorderAdminCombos } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { toast } from '../../components/ui/toast'
import { COMBOS_COPY } from './combos.copy'

/** Lo que se guarda antes del cambio optimista, para volver atrás si falla. */
interface ReorderSnapshot {
  /** Los combos en caché antes de mover, o `undefined` si no había. */
  previous: Combo[] | undefined
}

/**
 * Mutación que guarda el orden nuevo de los combos (`PUT /admin/combos/order`).
 *
 * Es optimista: la caché toma el orden nuevo (con sus posiciones) antes de llamar a la API, así
 * `SortableList` lo sigue mostrando. Si falla, vuelve al orden anterior y avisa "No pudimos
 * guardar el orden. Volvimos al anterior." (un `401` o un `403` los avisa la estructura del
 * dashboard); si sale bien, avisa "Orden guardado.". Al terminar invalida los combos.
 *
 * @returns La mutación de TanStack Query; se llama con los combos en el orden nuevo.
 */
export function useReorderCombos() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const key = queryKeys.adminCombos()
  return useMutation({
    mutationFn: (combos: Combo[]) =>
      reorderAdminCombos(
        api,
        combos.map((combo) => combo.id),
      ),
    onMutate: async (combos): Promise<ReorderSnapshot> => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Combo[]>(key)
      queryClient.setQueryData<Combo[]>(
        key,
        combos.map((combo, index) => ({ ...combo, position: index + 1 })),
      )
      return { previous }
    },
    onError: (error, _combos, snapshot) => {
      if (snapshot?.previous !== undefined) queryClient.setQueryData(key, snapshot.previous)
      if (isApiError(error) && (error.kind === 'unauthorized' || error.kind === 'forbidden')) return
      toast.error(COMBOS_COPY.order.failed)
    },
    onSuccess: () => {
      toast.success(COMBOS_COPY.order.saved)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
