import type { ReactNode } from 'react'
import { Button } from './Button'
import { UI_COPY } from './ui.copy'

/** Props de {@link FormActions}. */
export interface FormActionsProps {
  /** Si el formulario tiene cambios sin guardar (`formState.isDirty`). */
  isDirty: boolean
  /** Si se está guardando (`formState.isSubmitting` o `mutation.isPending`). */
  isSubmitting: boolean
  /** Texto del botón principal. Por defecto "Guardar cambios". */
  submitLabel?: string
  /** Vuelve a los valores guardados (por ejemplo `reset()`). */
  onDiscard: () => void
}

/**
 * Barra de acciones de un formulario, pegada abajo (`sticky bottom-0`) con fondo
 * `background` al 90 %. Va dentro del `<form>`.
 *
 * Con cambios avisa "Cambios sin guardar" (anunciado por `aria-live`). "Descartar" queda
 * deshabilitado sin cambios o mientras se guarda. El botón principal envía el formulario
 * (`type="submit"`); mientras se guarda dice "Guardando…", muestra el indicador y se deshabilita.
 *
 * @param props - Ver {@link FormActionsProps}.
 * @throws {RangeError} Si `submitLabel` está vacío.
 * @example
 * <FormActions isDirty={isDirty} isSubmitting={mutation.isPending} onDiscard={() => reset()} />
 */
export function FormActions({
  isDirty,
  isSubmitting,
  submitLabel = UI_COPY.saveChanges,
  onDiscard,
}: FormActionsProps): ReactNode {
  if (submitLabel.trim() === '') {
    throw new RangeError('El texto del botón para guardar no puede estar vacío.')
  }
  return (
    <div className="border-divider bg-background/90 sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 border-t py-3">
      <p aria-live="polite" className="mr-auto text-sm text-neutral-400">
        {isDirty && (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="bg-accent size-2 rounded-full" />
            {UI_COPY.unsavedChanges}
          </span>
        )}
      </p>
      <Button variant="secondary" onClick={onDiscard} disabled={!isDirty || isSubmitting}>
        {UI_COPY.discard}
      </Button>
      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting ? UI_COPY.saving : submitLabel}
      </Button>
    </div>
  )
}
