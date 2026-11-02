import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, ImageIcon } from '@phosphor-icons/react'
import type { Category } from '@galpon/api-client'
import type { SortableItemHelpers } from '../../../components/ui/SortableList'
import { ActionsMenu } from '../../../components/ui/ActionsMenu'
import { Button } from '../../../components/ui/Button'
import {
  actionsLabel,
  CATEGORIES_COPY,
  dragLabel,
  moveDownLabel,
  moveUpLabel,
  publishedCount,
  storePath,
} from '../categories.copy'

/** Props de {@link CategoryRow}. */
export interface CategoryRowProps {
  /** La línea. */
  category: Category
  /** Lo que entrega `SortableList` para moverla. */
  helpers: SortableItemHelpers
  /** "Editar" del menú de acciones. */
  onEdit: () => void
  /** "Borrar" del menú de acciones. */
  onDelete: () => void
}

/**
 * Fila de una línea en la lista reordenable: agarradera, foto de 48 × 48 (o el ícono), nombre y
 * dirección en la tienda (`font-mono`), grupo, publicados, "Subir" / "Bajar" y el menú de
 * acciones ("Editar" y "Borrar"). Debajo de 640 px, el grupo y los publicados van bajo el nombre.
 *
 * @param props - Ver {@link CategoryRowProps}.
 */
export function CategoryRow({ category, helpers, onEdit, onDelete }: CategoryRowProps): ReactNode {
  const { name } = category
  return (
    <div className="bg-surface flex items-center gap-3 rounded-lg p-3 shadow-sm">
      {helpers.dragHandle(dragLabel(name))}
      {category.image === null ? (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-neutral-400">
          <ImageIcon size={18} weight="regular" aria-hidden="true" />
        </span>
      ) : (
        <img
          src={category.image.url}
          alt={category.image.alt}
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-md object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-col sm:flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className="truncate font-mono text-xs text-neutral-400">{storePath(category.slug)}</p>
        </div>
        <div className="flex gap-2 text-xs text-neutral-400 sm:contents sm:text-sm">
          <p className="sm:w-24">{CATEGORIES_COPY.groups[category.group]}</p>
          <p className="tabular-nums sm:w-28">{publishedCount(category.productCount)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="icon"
          aria-label={moveUpLabel(name)}
          disabled={helpers.isFirst}
          onClick={helpers.moveUp}
        >
          <ArrowUpIcon size={18} weight="regular" aria-hidden="true" />
        </Button>
        <Button
          variant="icon"
          aria-label={moveDownLabel(name)}
          disabled={helpers.isLast}
          onClick={helpers.moveDown}
        >
          <ArrowDownIcon size={18} weight="regular" aria-hidden="true" />
        </Button>
        <ActionsMenu
          label={actionsLabel(name)}
          items={[
            { label: CATEGORIES_COPY.actions.edit, onSelect: onEdit },
            { label: CATEGORIES_COPY.actions.delete, onSelect: onDelete, tone: 'danger' },
          ]}
        />
      </div>
    </div>
  )
}
