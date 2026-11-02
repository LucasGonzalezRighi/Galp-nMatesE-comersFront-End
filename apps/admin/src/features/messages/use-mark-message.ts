import type { QueryKey } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ContactMessage, ContactMessagePage, DashboardSummary } from '@galpon/api-client'
import { isApiError, updateAdminMessage } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { toast } from '../../components/ui/toast'
import { MESSAGES_COPY } from './messages.copy'

/** Lo que recibe la mutación: el mensaje y cómo queda. */
export interface MarkMessageVariables {
  /** El mensaje, tal como está en la lista. */
  message: ContactMessage
  /** `true` lo marca leído; `false`, sin leer. */
  read: boolean
}

/** Lo que se guarda antes del cambio optimista, para volver atrás si falla. */
interface MarkMessageSnapshot {
  pages: readonly (readonly [QueryKey, ContactMessagePage | undefined])[]
  summary: DashboardSummary | undefined
}

/** Avisa que el cambio falló; un `401` o un `403` los atiende la estructura del dashboard. */
function notifyError(error: unknown): void {
  if (isApiError(error)) {
    if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
    toast.error(error.message)
    return
  }
  toast.error(MESSAGES_COPY.saveError)
}

/**
 * Mutación que marca un mensaje como leído o sin leer, sin confirmación.
 *
 * Es optimista: el mensaje cambia en su lugar al instante (no sale de la lista aunque esté el
 * filtro "Solo sin leer", para no esconder lo que se está leyendo) y el contador de sin leer del
 * resumen se ajusta. Si falla, vuelve como estaba y avisa con un toast de error; "sin leer" avisa
 * también cuando sale bien. Al terminar marca la bandeja como vieja sin volver a pedir la lista
 * abierta, y actualiza el resumen (contadores del menú y del inicio).
 *
 * @returns La mutación de TanStack Query; se llama con {@link MarkMessageVariables}.
 */
export function useMarkMessage() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation<ContactMessage, unknown, MarkMessageVariables, MarkMessageSnapshot>({
    mutationFn: ({ message, read }) => updateAdminMessage(api, message.id, { read }),
    onMutate: async ({ message, read }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.adminMessagesAll() })
      await queryClient.cancelQueries({ queryKey: queryKeys.adminDashboard() })
      const snapshot: MarkMessageSnapshot = {
        pages: queryClient.getQueriesData<ContactMessagePage>({
          queryKey: queryKeys.adminMessagesAll(),
        }),
        summary: queryClient.getQueryData<DashboardSummary>(queryKeys.adminDashboard()),
      }
      queryClient.setQueriesData<ContactMessagePage>(
        { queryKey: queryKeys.adminMessagesAll() },
        (page) =>
          page === undefined
            ? page
            : {
                ...page,
                items: page.items.map((item) =>
                  item.id === message.id ? { ...item, read } : item,
                ),
              },
      )
      if (snapshot.summary !== undefined && message.read !== read) {
        queryClient.setQueryData<DashboardSummary>(queryKeys.adminDashboard(), {
          ...snapshot.summary,
          unreadMessages: Math.max(0, snapshot.summary.unreadMessages + (read ? -1 : 1)),
        })
      }
      return snapshot
    },
    onError: (error, _variables, snapshot) => {
      if (snapshot !== undefined) {
        for (const [key, page] of snapshot.pages) queryClient.setQueryData(key, page)
        queryClient.setQueryData(queryKeys.adminDashboard(), snapshot.summary)
      }
      notifyError(error)
    },
    onSuccess: (_message, { read }) => {
      if (!read) toast.success(MESSAGES_COPY.markedUnread)
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.adminMessagesAll(),
          refetchType: 'none',
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard() }),
      ]),
  })
}
