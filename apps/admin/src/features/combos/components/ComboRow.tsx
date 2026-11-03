import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, ImageIcon } from '@phosphor-icons/react'
import type { Combo } from '@galpon/api-client'
import { formatPesos, pesos } from '@galpon/domain'
import type { SortableItemHelpers } from '../../../components/ui/SortableList'
import { ActionsMenu } from '../../../components/ui/ActionsMenu'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { comboWarnings } from '../combo-warnings'
import {
  actionsLabel,
  COMBOS_COPY,
  dragLabel,
  moveDownLabel,
  moveUpLabel,
  piecesText,
  savingsText,
} from '../combos.copy'

/** Props de {@link ComboRow}. */
export interface ComboRowProps {
  /** El combo. */
  combo: Combo
  /** Lo que entrega `SortableList` para moverlo. */
  helpers: SortableItemHelpers
  /** "Editar" del menú de acciones. */
  onEdit: () => void
  /** "Borrar" del menú de acciones. */
  onDelete: () => void
}

/**
 * Fotos de las piezas, de 40 × 40 y superpuestas (decorativas: los nombres van al lado). Debajo
 * de 640 px no se dibujan, para dejarle el ancho al nombre.
 */
function PiecePhotos({ combo }: { combo: Combo }): ReactNode {
  return (
    <div className="hidden shrink-0 sm:flex" aria-hidden="true">
      {combo.items.map((item, index) => (
        <span
          key={item.productId}
          className={
            index === 0
              ? 'ring-surface flex size-10 overflow-hidden rounded-md bg-neutral-900 ring-2'
              : 'ring-surface -ml-3 flex size-10 overflow-hidden rounded-md bg-neutral-900 ring-2'
          }
        >
          {item.image === null ? (
            <ImageIcon size={16} weight="regular" className="m-auto text-neutral-400" />
          ) : (
            <img src={item.image.url} alt="" width={40} height={40} className="object-cover" />
          )}
        </span>
      ))}
    </div>
  )
}

/**
 * Fila de un combo en la lista reordenable: agarradera, fotos de las piezas (desde 640 px),
 * nombre y piezas ("A + B"), precio final y ahorro, estado ("Publicado" o "Borrador"), los avisos
 * de `comboWarnings` ("Pieza no disponible", "Sin stock", "Sin ahorro"), "Subir" / "Bajar" y el menú
 * de acciones ("Editar" y "Borrar"). Debajo de 640 px, el precio, el estado y los avisos van bajo
 * el nombre.
 *
 * @param props - Ver {@link ComboRowProps}.
 */
export function ComboRow({ combo, helpers, onEdit, onDelete }: ComboRowProps): ReactNode {
  const { name } = combo
  const warnings = comboWarnings(combo)
  const pieces = combo.items.map((item) => item.name)
  return (
    <div className="bg-surface flex items-center gap-3 rounded-lg p-3 shadow-sm">
      {helpers.dragHandle(dragLabel(name))}
      <PiecePhotos combo={combo} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-col sm:flex-1">
          <p className="truncate font-medium">{name}</p>
          {pieces.length > 0 && (
            <p className="truncate text-xs text-neutral-400">{piecesText(pieces)}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          <p className="flex items-baseline gap-x-2 tabular-nums sm:w-28 sm:flex-col sm:items-end">
            <span className="font-medium">{formatPesos(pesos(combo.priceArs))}</span>
            {combo.savingsArs > 0 && (
              <span className="text-xs text-neutral-400">{savingsText(combo.savingsArs)}</span>
            )}
          </p>
          <Badge tone={combo.status === 'published' ? 'success' : 'neutral'}>
            {COMBOS_COPY.status[combo.status]}
          </Badge>
          {warnings.map((warning) => (
            <Badge key={warning} tone="danger">
              {COMBOS_COPY.warnings[warning]}
            </Badge>
          ))}
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
            { label: COMBOS_COPY.actions.edit, onSelect: onEdit },
            { label: COMBOS_COPY.actions.delete, onSelect: onDelete, tone: 'danger' },
          ]}
        />
      </div>
    </div>
  )
}
