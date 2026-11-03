import type { ReactNode } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { Combo } from '@galpon/api-client'
import { adminCombosQuery, useApiClient } from '@galpon/api-client/react'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { SortableList } from '../../../components/ui/SortableList'
import { COMBOS_COPY } from '../combos.copy'
import { useReorderCombos } from '../use-reorder-combos'
import { ComboFormDialog } from './ComboFormDialog'
import { ComboRow } from './ComboRow'
import { DeleteComboDialog } from './DeleteComboDialog'

/** Un diálogo de la pantalla: abierto o cerrando, con su combo y una `key` por apertura. */
interface DialogState {
  /** Si está abierto. */
  open: boolean
  /** El combo (en el formulario, `null` para uno nuevo). */
  combo: Combo | null
  /** Cambia en cada apertura, así el diálogo arranca de cero. */
  session: number
}

/** Ningún diálogo abierto todavía. */
const CLOSED: DialogState = { open: false, combo: null, session: 0 }

/** Filas grises con la forma de un combo, mientras carga. */
function CombosSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="sr-only">
        {COMBOS_COPY.loading}
      </p>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="bg-surface flex items-center gap-3 rounded-lg p-3 shadow-sm">
          <Skeleton className="size-9" />
          <Skeleton className="h-10 w-17" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Pantalla `/combos`: los combos por posición en una lista reordenable (arrastre, "Subir" /
 * "Bajar" o las flechas desde la agarradera), con el orden optimista de `useReorderCombos`, el
 * diálogo para crear o editar y la confirmación para borrar. Guardar invalida los combos del
 * dashboard al instante; la tienda la revalida el back con la etiqueta `combos`.
 */
export function CombosScreen(): ReactNode {
  const api = useApiClient()
  const combos = useQuery(adminCombosQuery(api))
  const reorder = useReorderCombos()
  // Orden que se está guardando: se muestra hasta que terminan (bien o mal) todos los guardados.
  const [order, setOrder] = useState<Combo[] | null>(null)
  // Guardados del orden en curso. Con dos movimientos seguidos, el primero que termina no limpia
  // el orden local: la caché podría tener todavía el orden intermedio (o el anterior, si falló).
  const pendingReorders = useRef(0)
  const [editor, setEditor] = useState<DialogState>(CLOSED)
  const [deleting, setDeleting] = useState<DialogState>(CLOSED)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const openEditor = (combo: Combo | null) => {
    setEditor((current) => ({ open: true, combo, session: current.session + 1 }))
  }

  const openDelete = (combo: Combo) => {
    setDeleting((current) => ({ open: true, combo, session: current.session + 1 }))
  }

  function renderList(): ReactNode {
    // El error solo reemplaza a la lista si nunca hubo datos: una recarga en segundo plano que
    // falla la deja como está.
    if (combos.data === undefined) {
      if (!combos.isError) return <CombosSkeleton />
      return (
        <ErrorState
          title={COMBOS_COPY.loadError}
          onRetry={() => void combos.refetch()}
          className="bg-surface rounded-lg shadow-sm"
        />
      )
    }
    if (combos.data.length === 0) {
      return (
        <EmptyState
          title={COMBOS_COPY.empty}
          className="bg-surface rounded-lg shadow-sm"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                openEditor(null)
              }}
            >
              {COMBOS_COPY.emptyAction}
            </Button>
          }
        />
      )
    }
    return (
      <SortableList
        items={order ?? combos.data}
        getKey={(combo) => combo.id}
        label={COMBOS_COPY.listLabel}
        onReorder={(next) => {
          // El orden nuevo se pasa en el mismo cuadro (SortableList lo pide): si se esperara a la
          // caché y el guardado fallara antes de dibujarla, la lista no vería volver el anterior.
          setOrder(next)
          pendingReorders.current += 1
          // `mutateAsync` termina por cada guardado (los callbacks de `mutate` solo avisan del
          // último), y después de que `onSettled` recargó los combos.
          const settle = () => {
            pendingReorders.current -= 1
            if (pendingReorders.current === 0) setOrder(null)
          }
          // El error ya lo avisa `useReorderCombos`.
          reorder.mutateAsync(next).then(settle, settle)
        }}
        renderItem={(combo, helpers) => (
          <ComboRow
            combo={combo}
            helpers={helpers}
            onEdit={() => {
              openEditor(combo)
            }}
            onDelete={() => {
              openDelete(combo)
            }}
          />
        )}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        headingRef={headingRef}
        title={COMBOS_COPY.title}
        description={COMBOS_COPY.description}
        actions={
          <Button
            onClick={() => {
              openEditor(null)
            }}
          >
            <PlusIcon size={18} weight="regular" aria-hidden="true" />
            {COMBOS_COPY.newCombo}
          </Button>
        }
      />
      {renderList()}
      <ComboFormDialog
        key={`editor-${String(editor.session)}`}
        open={editor.open}
        combo={editor.combo}
        onClose={() => {
          setEditor((current) => ({ ...current, open: false }))
        }}
      />
      <DeleteComboDialog
        key={`delete-${String(deleting.session)}`}
        open={deleting.open}
        combo={deleting.combo}
        onClose={() => {
          setDeleting((current) => ({ ...current, open: false }))
        }}
        focusAfterDelete={() => headingRef.current}
      />
    </div>
  )
}
