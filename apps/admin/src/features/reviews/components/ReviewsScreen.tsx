import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminDashboardQuery, adminReviewsQuery, useApiClient } from '@galpon/api-client/react'
import type { ReviewsSearch, ReviewsTab } from '../reviews-search'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Pagination } from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import { Tabs } from '../../../components/ui/Tabs'
import { REVIEWS_TAB_STATUS, REVIEWS_TABS } from '../reviews-search'
import { REVIEWS_COPY } from '../reviews.copy'
import { useModerateReview } from '../use-moderate-review'
import { ReviewCard } from './ReviewCard'

/** Props de {@link ReviewsScreen}. */
export interface ReviewsScreenProps {
  /** Pestaña y página (de la URL). */
  search: ReviewsSearch
  /** Se llama con la búsqueda nueva al cambiar de pestaña o de página. */
  onSearchChange: (search: ReviewsSearch) => void
  /** URL de la tienda, sin barra final: cada reseña enlaza a la ficha de su producto. */
  storeUrl: string
}

/** Es una pestaña de reseñas (lo que entrega `Tabs` es un texto cualquiera). */
function isReviewsTab(value: string): value is ReviewsTab {
  return (REVIEWS_TABS as readonly string[]).includes(value)
}

/** Tarjetas grises con la forma de una reseña, mientras carga. */
function ReviewsSkeleton(): ReactNode {
  return (
    <div aria-busy="true" aria-label={REVIEWS_COPY.listLabel} className="flex flex-col gap-4">
      {[0, 1, 2].map((index) => (
        <div key={index} className="bg-surface flex flex-col gap-4 rounded-lg p-4 shadow-sm lg:p-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-48" />
        </div>
      ))}
    </div>
  )
}

/**
 * Pantalla `/resenas`: las reseñas por estado ("Pendientes", con su contador, "Aprobadas" y
 * "Ocultas"), de a 20, para aprobar, ocultar, destacar en el inicio o devolver a pendientes sin
 * confirmación (cada cambio avisa con un toast y se puede deshacer).
 *
 * @param props - Ver {@link ReviewsScreenProps}.
 */
export function ReviewsScreen({ search, onSearchChange, storeUrl }: ReviewsScreenProps): ReactNode {
  const api = useApiClient()
  const reviews = useQuery(
    adminReviewsQuery(api, { status: REVIEWS_TAB_STATUS[search.estado], page: search.pagina }),
  )
  const summary = useQuery(adminDashboardQuery(api))
  const moderate = useModerateReview()

  function goTo(estado: ReviewsTab) {
    onSearchChange({ estado, pagina: 1 })
  }

  function renderList(): ReactNode {
    if (reviews.isPending) return <ReviewsSkeleton />
    if (reviews.isError) {
      return (
        <ErrorState
          title={REVIEWS_COPY.loadError}
          onRetry={() => void reviews.refetch()}
          className="bg-surface rounded-lg shadow-sm"
        />
      )
    }
    const { items, page, pageSize, total } = reviews.data
    if (items.length === 0) {
      const shortcut = REVIEWS_COPY.emptyAction[search.estado]
      return (
        <EmptyState
          title={REVIEWS_COPY.empty[search.estado]}
          className="bg-surface rounded-lg shadow-sm"
          action={
            search.pagina > 1 ? (
              <Button
                variant="secondary"
                onClick={() => {
                  goTo(search.estado)
                }}
              >
                {REVIEWS_COPY.firstPage}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  goTo(shortcut.tab)
                }}
              >
                {shortcut.label}
              </Button>
            )
          }
        />
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-4">
          {items.map((review) => (
            <li key={review.id}>
              <ReviewCard
                review={review}
                storeUrl={storeUrl}
                isPending={moderate.isPending && moderate.variables.review.id === review.id}
                onAction={(action) => {
                  moderate.mutate({ review, action })
                }}
              />
            </li>
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
      <PageHeader title={REVIEWS_COPY.title} description={REVIEWS_COPY.description} />
      <Tabs
        value={search.estado}
        onValueChange={(value) => {
          if (isReviewsTab(value)) goTo(value)
        }}
        label={REVIEWS_COPY.tabsLabel}
        items={REVIEWS_TABS.map((tab) => ({
          value: tab,
          label: REVIEWS_COPY.tabs[tab],
          count: tab === 'pendientes' ? summary.data?.pendingReviews : undefined,
        }))}
      >
        {renderList()}
      </Tabs>
    </div>
  )
}
