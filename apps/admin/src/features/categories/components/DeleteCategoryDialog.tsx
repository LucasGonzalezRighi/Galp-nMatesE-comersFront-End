import type { ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { Category } from '@galpon/api-client'
import { deleteAdminCategory, isApiError } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { toast } from '../../../components/ui/toast'
import { CATEGORIES_COPY, deleteTitle } from '../categories.copy'

/** Props de {@link DeleteCategoryDialog}. */
export interface DeleteCategoryDialogProps {
  /** Si está abierto. */
  open: boolean
  /** La línea a borrar (se conserva al cerrar, para que el texto no cambie durante el fundido). */
  category: Category | null
  /** Se llama para cerrarlo: al cancelar o al borrar. */
  onClose: () => void
  /**
   * Adónde va el foco después de borrar (el `h1` de la pantalla): la fila con el botón que abrió
   * el diálogo sale de la lista con la recarga. Al cancelar, el foco vuelve a ese botón.
   */
  focusAfterDelete: () => HTMLElement | null
}

/**
 * Confirmación "¿Borrar la línea «{nombre}»?". Solo el servidor sabe si tiene productos (cuenta
 * también borradores y archivados, mientras `productCount` cuenta solo los publicados), así que
 * no se decide con el contador: un `409` se explica dentro del diálogo con `role="alert"` y el
 * diálogo sigue abierto. Al borrar avisa "Línea borrada.", invalida las líneas y el foco va a
 * `focusAfterDelete`. Quien lo usa le cambia la `key` en cada apertura, así el error de la vez
 * anterior no queda.
 *
 * @param props - Ver {@link DeleteCategoryDialogProps}.
 */
export function DeleteCategoryDialog({
  open,
  category,
  onClose,
  focusAfterDelete,
}: DeleteCategoryDialogProps): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const [conflict, setConflict] = useState<string | null>(null)
  // El diálogo cierra antes de recargar: el botón de la fila sigue en pantalla al cerrarse y
  // desaparece después, así que el destino del foco se decide por lo que pasó, no por el abridor.
  const deletedRef = useRef(false)
  const remove = useMutation({
    mutationFn: (id: string) => deleteAdminCategory(api, id),
    onSuccess: async () => {
      toast.success(CATEGORIES_COPY.remove.deleted)
      deletedRef.current = true
      onClose()
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminCategories() })
    },
    onError: (error) => {
      if (!isApiError(error)) {
        toast.error(CATEGORIES_COPY.remove.error)
        return
      }
      // "Tu sesión venció" (401) y el token CSRF rotado (403) los resuelve la estructura.
      if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
      if (error.kind === 'conflict') {
        setConflict(
          error.problem?.type === 'category_has_products'
            ? CATEGORIES_COPY.remove.hasProducts
            : error.message,
        )
        return
      }
      toast.error(error.message)
    },
  })

  if (category === null) return null
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={deleteTitle(category.name)}
      description={CATEGORIES_COPY.remove.description}
      confirmLabel={CATEGORIES_COPY.remove.confirm}
      tone="danger"
      isPending={remove.isPending}
      returnFocusTo={() => (deletedRef.current ? focusAfterDelete() : null)}
      onConfirm={() => {
        setConflict(null)
        remove.mutate(category.id)
      }}
    >
      {conflict}
    </ConfirmDialog>
  )
}
