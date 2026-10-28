import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { REVIEWS_SEARCH_DEFAULTS, ReviewsScreen, reviewsSearchSchema } from '../../features/reviews'

/** Ruta `/resenas`: moderación de reseñas, con la pestaña (`?estado=`) y la página en la URL. */
export const Route = createFileRoute('/_authenticated/resenas')({
  validateSearch: reviewsSearchSchema,
  search: { middlewares: [stripSearchParams(REVIEWS_SEARCH_DEFAULTS)] },
  component: ReviewsPage,
})

function ReviewsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { storeUrl } = Route.useRouteContext()
  return (
    <ReviewsScreen
      search={search}
      storeUrl={storeUrl}
      onSearchChange={(next) => void navigate({ search: next })}
    />
  )
}
