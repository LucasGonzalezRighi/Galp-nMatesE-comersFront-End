import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Category } from '@galpon/api-client'
import { isApiError, reorderAdminCategories } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { toast } from '../../components/ui/toast'
import { CATEGORIES_COPY } from './categories.copy'

/** Lo que se guarda antes del cambio optimista, para volver atrás si falla. */
interface ReorderSnapshot {
  /** Las líneas en caché antes de mover, o `undefined` si no había. */
  previous: Category[] | undefined
}

/**
 * Mutación que guarda el orden nuevo de las líneas (`PUT /admin/categories/order`).
 *
 * Es optimista: la caché toma el orden nuevo (con sus posiciones) antes de llamar a la API, así
 * `SortableList` lo sigue mostrando. Si falla, vuelve al orden anterior y avisa "No pudimos
 * guardar el orden. Volvimos al anterior." (un `401` o un `403` los avisa la estructura del
 * dashboard); si sale bien, avisa "Orden guardado.". Al terminar invalida las líneas.
 *
 * @returns La mutación de TanStack Query; se llama con las líneas en el orden nuevo.
 */
export function useReorderCategories() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const key = queryKeys.adminCategories()
  return useMutation({
    mutationFn: (categories: Category[]) =>
      reorderAdminCategories(
        api,
        categories.map((category) => category.id),
      ),
    onMutate: async (categories): Promise<ReorderSnapshot> => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Category[]>(key)
      queryClient.setQueryData<Category[]>(
        key,
        categories.map((category, index) => ({ ...category, position: index + 1 })),
      )
      return { previous }
    },
    onError: (error, _categories, snapshot) => {
      if (snapshot?.previous !== undefined) queryClient.setQueryData(key, snapshot.previous)
      if (isApiError(error) && (error.kind === 'unauthorized' || error.kind === 'forbidden')) return
      toast.error(CATEGORIES_COPY.order.failed)
    },
    onSuccess: () => {
      toast.success(CATEGORIES_COPY.order.saved)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
