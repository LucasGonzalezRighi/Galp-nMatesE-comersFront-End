import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@phosphor-icons/react'
import type { SortableItemHelpers } from '../../../components/ui/SortableList'
import { Button } from '../../../components/ui/Button'
import { focusListNeighbor } from '../../../components/ui/focus-list-neighbor'
import { actionLabel, CONTENT_COPY } from '../content.copy'

/** Props de {@link ItemActions}. */
export interface ItemActionsProps {
  /** Nombre del elemento, para los botones ("Subir Envíos", "Quitar la pregunta 2 de Envíos"). */
  name: string
  /** Lo que `SortableList` le pasa al ítem: mover y la agarradera. */
  helpers: SortableItemHelpers
  /** Quita el elemento; sin esta función no hay botón "Quitar" (por ejemplo, el único). */
  onRemove?: () => void
}

/**
 * Acciones de un elemento de una lista reordenable de contenido: la agarradera para arrastrar,
 * "Subir", "Bajar" (deshabilitados en los extremos) y "Quitar". Al quitar, el foco va al primer
 * campo del elemento que queda en ese lugar (o del anterior, si era el último), como en
 * `TextListField`.
 *
 * @param props - Ver {@link ItemActionsProps}.
 */
export function ItemActions({ name, helpers, onRemove }: ItemActionsProps): ReactNode {
  return (
    <>
      {helpers.dragHandle(actionLabel(CONTENT_COPY.drag, name))}
      <Button
        variant="icon"
        aria-label={actionLabel(CONTENT_COPY.moveUp, name)}
        disabled={helpers.isFirst}
        onClick={helpers.moveUp}
      >
        <ArrowUpIcon size={18} weight="regular" aria-hidden="true" />
      </Button>
      <Button
        variant="icon"
        aria-label={actionLabel(CONTENT_COPY.moveDown, name)}
        disabled={helpers.isLast}
        onClick={helpers.moveDown}
      >
        <ArrowDownIcon size={18} weight="regular" aria-hidden="true" />
      </Button>
      {onRemove !== undefined && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={actionLabel(CONTENT_COPY.remove, name)}
          onClick={(event) => {
            focusListNeighbor(event.currentTarget, 'input, textarea')
            onRemove()
          }}
        >
          <TrashIcon size={18} weight="regular" aria-hidden="true" />
          {CONTENT_COPY.remove}
        </Button>
      )}
    </>
  )
}
