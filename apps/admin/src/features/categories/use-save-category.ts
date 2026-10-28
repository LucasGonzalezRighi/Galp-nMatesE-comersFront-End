import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Category } from '@galpon/api-client'
import type { CategoryForm } from '@galpon/schemas'
import { createAdminCategory, updateAdminCategory } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { toast } from '../../components/ui/toast'
import { CATEGORIES_COPY } from './categories.copy'

/**
 * Mutación que crea una línea (con `id` en `null`) o guarda los cambios de una existente.
 *
 * Con éxito avisa "Línea creada." o "Cambios guardados." e invalida las líneas (y, al editar,
 * los productos, que muestran el nombre de su línea). Los errores los atiende quien la usa: el
 * `409 slug_taken` y el `422` van a los campos del formulario.
 *
 * @param id - Identificador de la línea que se edita, o `null` para crear una.
 * @returns La mutación de TanStack Query; se llama con la línea ya validada.
 */
export function useSaveCategory(id: string | null) {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation<Category, unknown, CategoryForm>({
    mutationFn: (values) =>
      id === null ? createAdminCategory(api, values) : updateAdminCategory(api, id, values),
    onSuccess: () => {
      toast.success(id === null ? CATEGORIES_COPY.form.created : CATEGORIES_COPY.form.updated)
      const keys = [
        queryKeys.adminCategories(),
        ...(id === null ? [] : [queryKeys.adminProductsAll()]),
      ]
      return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
  })
}
