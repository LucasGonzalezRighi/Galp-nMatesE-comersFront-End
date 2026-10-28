import type { ReactNode } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { Category } from '@galpon/api-client'
import { adminCategoriesQuery, useApiClient } from '@galpon/api-client/react'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { SortableList } from '../../../components/ui/SortableList'
import { CATEGORIES_COPY } from '../categories.copy'
import { useReorderCategories } from '../use-reorder-categories'
import { CategoryFormDialog } from './CategoryFormDialog'
import { CategoryRow } from './CategoryRow'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'

/** Un diálogo de la pantalla: abierto o cerrando, con su línea y una `key` por apertura. */
interface DialogState {
  /** Si está abierto. */
  open: boolean
  /** La línea (en el formulario, `null` para una nueva). */
  category: Category | null
  /** Cambia en cada apertura, así el diálogo arranca de cero. */
  session: number
}

/** Ningún diálogo abierto todavía. */
const CLOSED: DialogState = { open: false, category: null, session: 0 }

/** Filas grises con la forma de una línea, mientras carga. */
function CategoriesSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="sr-only">
        {CATEGORIES_COPY.loading}
      </p>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="bg-surface flex items-center gap-3 rounded-lg p-3 shadow-sm">
          <Skeleton className="size-9" />
          <Skeleton className="size-12" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Pantalla `/lineas`: las líneas por posición en una lista reordenable (arrastre, "Subir" /
 * "Bajar" o las flechas desde la agarradera), con el orden optimista de
 * `useReorderCategories`, el diálogo para crear o editar y la confirmación para borrar.
 */
export function CategoriesScreen(): ReactNode {
  const api = useApiClient()
  const categories = useQuery(adminCategoriesQuery(api))
  const reorder = useReorderCategories()
  // Orden que se está guardando: se muestra hasta que termina (bien o mal) el guardado.
  const [order, setOrder] = useState<Category[] | null>(null)
  const [editor, setEditor] = useState<DialogState>(CLOSED)
  const [deleting, setDeleting] = useState<DialogState>(CLOSED)

  const openEditor = (category: Category | null) => {
    setEditor((current) => ({ open: true, category, session: current.session + 1 }))
  }

  const openDelete = (category: Category) => {
    setDeleting((current) => ({ open: true, category, session: current.session + 1 }))
  }

  function renderList(): ReactNode {
    // El error solo reemplaza a la lista si nunca hubo datos: una recarga en segundo plano que
    // falla la deja como está.
    if (categories.data === undefined) {
      if (!categories.isError) return <CategoriesSkeleton />
      return (
        <ErrorState
          title={CATEGORIES_COPY.loadError}
          onRetry={() => void categories.refetch()}
          className="bg-surface rounded-lg shadow-sm"
        />
      )
    }
    if (categories.data.length === 0) {
      return (
        <EmptyState
          title={CATEGORIES_COPY.empty}
          className="bg-surface rounded-lg shadow-sm"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                openEditor(null)
              }}
            >
              {CATEGORIES_COPY.emptyAction}
            </Button>
          }
        />
      )
    }
    return (
      <SortableList
        items={order ?? categories.data}
        getKey={(category) => category.id}
        label={CATEGORIES_COPY.listLabel}
        onReorder={(next) => {
          // El orden nuevo se pasa en el mismo cuadro (SortableList lo pide): si se esperara a la
          // caché y el guardado fallara antes de dibujarla, la lista no vería volver el anterior.
          setOrder(next)
          reorder.mutate(next, {
            onSettled: () => {
              setOrder(null)
            },
          })
        }}
        renderItem={(category, helpers) => (
          <CategoryRow
            category={category}
            helpers={helpers}
            onEdit={() => {
              openEditor(category)
            }}
            onDelete={() => {
              openDelete(category)
            }}
          />
        )}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={CATEGORIES_COPY.title}
        description={CATEGORIES_COPY.description}
        actions={
          <Button
            onClick={() => {
              openEditor(null)
            }}
          >
            <PlusIcon size={18} weight="regular" aria-hidden="true" />
            {CATEGORIES_COPY.newCategory}
          </Button>
        }
      />
      {renderList()}
      <CategoryFormDialog
        key={`editor-${String(editor.session)}`}
        open={editor.open}
        category={editor.category}
        onClose={() => {
          setEditor((current) => ({ ...current, open: false }))
        }}
      />
      <DeleteCategoryDialog
        key={`delete-${String(deleting.session)}`}
        open={deleting.open}
        category={deleting.category}
        onClose={() => {
          setDeleting((current) => ({ ...current, open: false }))
        }}
      />
    </div>
  )
}
