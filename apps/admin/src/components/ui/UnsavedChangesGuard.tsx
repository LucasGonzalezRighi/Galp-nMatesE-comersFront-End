import type { ReactNode } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { ConfirmDialog } from './ConfirmDialog'
import { OVERLAY_COPY } from './overlay.copy'

/** Props de {@link UnsavedChangesGuard}. */
export interface UnsavedChangesGuardProps {
  /** Si hay cambios sin guardar (por ejemplo `formState.isDirty`). */
  when: boolean
}

/**
 * Frena la navegación mientras haya cambios sin guardar y pregunta "¿Salir sin guardar?":
 * "Salir sin guardar" deja seguir y "Seguir editando" (o Escape) se queda en la pantalla. Con
 * cambios, también pide confirmación al recargar o cerrar la pestaña (`beforeunload`).
 *
 * @param props - Ver {@link UnsavedChangesGuardProps}.
 * @example
 * <UnsavedChangesGuard when={form.formState.isDirty && !save.isSuccess} />
 */
export function UnsavedChangesGuard({ when }: UnsavedChangesGuardProps): ReactNode {
  const blocker = useBlocker({
    shouldBlockFn: () => when,
    enableBeforeUnload: when,
    disabled: !when,
    withResolver: true,
  })
  return (
    <ConfirmDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.status === 'blocked') blocker.reset()
      }}
      title={OVERLAY_COPY.unsavedTitle}
      description={OVERLAY_COPY.unsavedDescription}
      confirmLabel={OVERLAY_COPY.unsavedConfirm}
      cancelLabel={OVERLAY_COPY.unsavedCancel}
      tone="danger"
      isPending={false}
      onConfirm={() => {
        if (blocker.status === 'blocked') blocker.proceed()
      }}
    />
  )
}
