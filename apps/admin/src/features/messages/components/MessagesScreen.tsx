import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { ContactMessage } from '@galpon/api-client'
import { adminMessagesQuery, useApiClient } from '@galpon/api-client/react'
import type { MessagesKindFilter, MessagesSearch } from '../messages-search'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Pagination } from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import { Tabs } from '../../../components/ui/Tabs'
import { MESSAGES_KIND_FILTERS, messagesQueryOf } from '../messages-search'
import { MESSAGES_COPY } from '../messages.copy'
import { useMarkMessage } from '../use-mark-message'
import { MessageItem } from './MessageItem'

/** Props de {@link MessagesScreen}. */
export interface MessagesScreenProps {
  /** Tipo, "solo sin leer" y página (de la URL). */
  search: MessagesSearch
  /** Se llama con la búsqueda nueva al cambiar un filtro o la página. */
  onSearchChange: (search: MessagesSearch) => void
}

/** Pestaña de todos los mensajes (sin `?tipo=`). */
const ALL_TAB = 'todos'

/** Es un filtro de tipo (lo que entrega `Tabs` es un texto cualquiera). */
function isKindFilter(value: string): value is MessagesKindFilter {
  return (MESSAGES_KIND_FILTERS as readonly string[]).includes(value)
}

/**
 * Mientras carga: "Cargando los mensajes…" oculto (`role="status"`, se anuncia) y renglones
 * grises decorativos con la forma de un mensaje.
 */
function MessagesSkeleton(): ReactNode {
  return (
    <>
      <p role="status" className="sr-only">
        {MESSAGES_COPY.loading}
      </p>
      <div className="bg-surface divide-divider flex flex-col divide-y rounded-lg shadow-sm">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex flex-col gap-2 px-4 py-3 sm:pl-9">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </>
  )
}

/**
 * Pantalla `/mensajes`: la bandeja de contacto y arrepentimientos, con pestañas por tipo,
 * "Solo sin leer" y de a 20. Desplegar un mensaje sin leer lo marca leído (sin confirmación);
 * "Marcar como no leído" lo devuelve y avisa con un toast.
 *
 * @param props - Ver {@link MessagesScreenProps}.
 */
export function MessagesScreen({ search, onSearchChange }: MessagesScreenProps): ReactNode {
  const api = useApiClient()
  const messages = useQuery(adminMessagesQuery(api, messagesQueryOf(search)))
  const mark = useMarkMessage()
  const [openId, setOpenId] = useState<string | null>(null)
  const hasFilters = search.tipo !== undefined || search.sinLeer === 1

  function toggle(message: ContactMessage) {
    if (openId === message.id) {
      setOpenId(null)
      return
    }
    setOpenId(message.id)
    if (!message.read) mark.mutate({ message, read: true })
  }

  function markUnread(message: ContactMessage) {
    setOpenId(null)
    mark.mutate({ message, read: false })
  }

  function renderEmpty(): ReactNode {
    if (search.pagina > 1) {
      return (
        <EmptyState
          title={hasFilters ? MESSAGES_COPY.emptyFiltered : MESSAGES_COPY.empty}
          className="bg-surface rounded-lg shadow-sm"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                onSearchChange({ ...search, pagina: 1 })
              }}
            >
              {MESSAGES_COPY.firstPage}
            </Button>
          }
        />
      )
    }
    if (hasFilters) {
      return (
        <EmptyState
          title={MESSAGES_COPY.emptyFiltered}
          className="bg-surface rounded-lg shadow-sm"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                onSearchChange({ pagina: 1 })
              }}
            >
              {MESSAGES_COPY.clearFilters}
            </Button>
          }
        />
      )
    }
    return <EmptyState title={MESSAGES_COPY.empty} className="bg-surface rounded-lg shadow-sm" />
  }

  function renderList(): ReactNode {
    if (messages.isPending) return <MessagesSkeleton />
    if (messages.isError) {
      return (
        <ErrorState
          title={MESSAGES_COPY.loadError}
          onRetry={() => void messages.refetch()}
          className="bg-surface rounded-lg shadow-sm"
        />
      )
    }
    const { items, page, pageSize, total } = messages.data
    if (items.length === 0) return renderEmpty()
    return (
      <div className="flex flex-col gap-4">
        <ul
          aria-label={MESSAGES_COPY.listLabel}
          className="bg-surface divide-divider divide-y overflow-hidden rounded-lg shadow-sm"
        >
          {items.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOpen={openId === message.id}
              isPending={mark.isPending && mark.variables.message.id === message.id}
              onToggle={() => {
                toggle(message)
              }}
              onMarkUnread={() => {
                markUnread(message)
              }}
            />
          ))}
        </ul>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(pagina) => {
            onSearchChange({ ...search, pagina })
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={MESSAGES_COPY.title} />
      <Tabs
        value={search.tipo ?? ALL_TAB}
        onValueChange={(value) => {
          onSearchChange({ ...search, tipo: isKindFilter(value) ? value : undefined, pagina: 1 })
        }}
        label={MESSAGES_COPY.tabsLabel}
        items={[
          { value: ALL_TAB, label: MESSAGES_COPY.tabs.todos },
          ...MESSAGES_KIND_FILTERS.map((kind) => ({
            value: kind,
            label: MESSAGES_COPY.tabs[kind],
          })),
        ]}
      >
        <div className="flex flex-col gap-4">
          <Checkbox
            label={MESSAGES_COPY.onlyUnread}
            checked={search.sinLeer === 1}
            onChange={(event) => {
              onSearchChange({
                ...search,
                sinLeer: event.currentTarget.checked ? 1 : undefined,
                pagina: 1,
              })
            }}
            className="self-start"
          />
          {renderList()}
        </div>
      </Tabs>
    </div>
  )
}
