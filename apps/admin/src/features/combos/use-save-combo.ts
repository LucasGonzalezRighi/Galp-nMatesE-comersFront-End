import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Combo } from '@galpon/api-client'
import type { ComboForm } from '@galpon/schemas'
import { createAdminCombo, updateAdminCombo } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { toast } from '../../components/ui/toast'
import { COMBOS_COPY } from './combos.copy'

/**
 * Mutación que crea un combo (con `id` en `null`) o guarda los cambios de uno existente (`PATCH`
 * con el combo completo).
 *
 * Con éxito avisa "Combo creado." o "Cambios guardados." e invalida los combos del dashboard, así
 * la lista se ve al instante. La tienda la revalida el back (etiqueta `combos`). Los errores los
 * atiende quien la usa: el `422` va a los campos del formulario.
 *
 * @param id - Identificador del combo que se edita, o `null` para crear uno.
 * @returns La mutación de TanStack Query; se llama con el combo ya validado.
 */
export function useSaveCombo(id: string | null) {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation<Combo, unknown, ComboForm>({
    mutationFn: (values) =>
      id === null ? createAdminCombo(api, values) : updateAdminCombo(api, id, values),
    onSuccess: () => {
      toast.success(id === null ? COMBOS_COPY.form.created : COMBOS_COPY.form.updated)
      return queryClient.invalidateQueries({ queryKey: queryKeys.adminCombos() })
    },
  })
}
