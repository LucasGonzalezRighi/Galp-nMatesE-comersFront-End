import type { ReactNode } from 'react'
import { useRef } from 'react'
import type { Combo } from '@galpon/api-client'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { COMBOS_COPY, deleteTitle } from '../combos.copy'
import { useDeleteCombo } from '../use-delete-combo'

/** Props de {@link DeleteComboDialog}. */
export interface DeleteComboDialogProps {
  /** Si está abierto. */
  open: boolean
  /** El combo a borrar (se conserva al cerrar, para que el texto no cambie durante el fundido). */
  combo: Combo | null
  /** Se llama para cerrarlo: al cancelar o al borrar. */
  onClose: () => void
  /**
   * Adónde va el foco después de borrar (el `h1` de la pantalla): la fila con el botón que abrió
   * el diálogo sale de la lista con la recarga. Al cancelar, el foco vuelve a ese botón.
   */
  focusAfterDelete: () => HTMLElement | null
}

/**
 * Confirmación "¿Borrar el combo «{nombre}»?" con `useDeleteCombo`. Un combo se puede borrar
 * siempre: la tienda deja de mostrarlo y los pedidos guardan su copia. Al borrar cierra y el foco
 * va a `focusAfterDelete`; si falla, el aviso lo da la mutación y el diálogo sigue abierto.
 *
 * @param props - Ver {@link DeleteComboDialogProps}.
 */
export function DeleteComboDialog({
  open,
  combo,
  onClose,
  focusAfterDelete,
}: DeleteComboDialogProps): ReactNode {
  const remove = useDeleteCombo()
  // El diálogo cierra antes de recargar: el botón de la fila sigue en pantalla al cerrarse y
  // desaparece después, así que el destino del foco se decide por lo que pasó, no por el abridor.
  const deletedRef = useRef(false)

  if (combo === null) return null
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={deleteTitle(combo.name)}
      description={COMBOS_COPY.remove.description}
      confirmLabel={COMBOS_COPY.remove.confirm}
      tone="danger"
      isPending={remove.isPending}
      returnFocusTo={() => (deletedRef.current ? focusAfterDelete() : null)}
      onConfirm={() => {
        remove.mutate(combo.id, {
          onSuccess: () => {
            deletedRef.current = true
            onClose()
          },
        })
      }}
    />
  )
}
