import type { QueryKey } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AdminReview, AdminReviewPage, DashboardSummary } from '@galpon/api-client'
import { isApiError, updateAdminReview } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import type { ReviewAction } from './review-actions'
import { toast } from '../../components/ui/toast'
import { REVIEW_ACTIONS, reviewAfter } from './review-actions'
import { REVIEWS_COPY } from './reviews.copy'

/** Lo que recibe la moderación: la reseña como se ve y la acción elegida. */
export interface ModerateReviewVariables {
  /** La reseña, tal como está en la tarjeta. */
  review: AdminReview
  /** La acción elegida. */
  action: ReviewAction
}

/** Lo que se guarda antes del cambio optimista, para volver atrás si falla. */
interface ModerateReviewSnapshot {
  pages: readonly (readonly [QueryKey, AdminReviewPage | undefined])[]
  summary: DashboardSummary | undefined
}

/**
 * Saca la reseña de las páginas cuyo estado ya no comparte y la actualiza en el resto.
 *
 * Cada página en caché es de una pestaña (un solo estado): si la reseña cambia de estado, deja
 * de pertenecer a la página donde estaba.
 */
function applyToPage(page: AdminReviewPage, next: AdminReview): AdminReviewPage {
  const current = page.items.find((item) => item.id === next.id)
  if (current === undefined) return page
  if (current.status !== next.status) {
    return {
      ...page,
      items: page.items.filter((item) => item.id !== next.id),
      total: Math.max(0, page.total - 1),
    }
  }
  return { ...page, items: page.items.map((item) => (item.id === next.id ? next : item)) }
}

/** Avisa que el cambio falló; un `401` o un `403` los atiende la estructura del dashboard. */
function notifyError(error: unknown): void {
  if (isApiError(error)) {
    if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
    toast.error(error.message)
    return
  }
  toast.error(REVIEWS_COPY.saveError)
}

/**
 * Mutación que aprueba, oculta, destaca o devuelve a pendientes una reseña, sin confirmación.
 *
 * Es optimista: la tarjeta sale de su pestaña (o cambia su etiqueta "Destacada") al instante y el
 * contador de pendientes del resumen se ajusta. Si falla, todo vuelve como estaba y avisa con un
 * toast de error; si sale bien, avisa con el toast de la acción. Al terminar invalida las reseñas
 * y el resumen (contadores del menú y del inicio).
 *
 * @returns La mutación de TanStack Query; se llama con {@link ModerateReviewVariables}.
 */
export function useModerateReview() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation<AdminReview, unknown, ModerateReviewVariables, ModerateReviewSnapshot>({
    mutationFn: ({ review, action }) =>
      updateAdminReview(api, review.id, REVIEW_ACTIONS[action].update),
    onMutate: async ({ review, action }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.adminReviewsAll() })
      await queryClient.cancelQueries({ queryKey: queryKeys.adminDashboard() })
      const snapshot: ModerateReviewSnapshot = {
        pages: queryClient.getQueriesData<AdminReviewPage>({
          queryKey: queryKeys.adminReviewsAll(),
        }),
        summary: queryClient.getQueryData<DashboardSummary>(queryKeys.adminDashboard()),
      }
      const next = reviewAfter(review, action)
      queryClient.setQueriesData<AdminReviewPage>(
        { queryKey: queryKeys.adminReviewsAll() },
        (page) => (page === undefined ? page : applyToPage(page, next)),
      )
      const delta = Number(next.status === 'pending') - Number(review.status === 'pending')
      if (snapshot.summary !== undefined && delta !== 0) {
        queryClient.setQueryData<DashboardSummary>(queryKeys.adminDashboard(), {
          ...snapshot.summary,
          pendingReviews: Math.max(0, snapshot.summary.pendingReviews + delta),
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
    onSuccess: (_review, { action }) => {
      toast.success(REVIEW_ACTIONS[action].toast)
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminReviewsAll() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard() }),
      ]),
  })
}
