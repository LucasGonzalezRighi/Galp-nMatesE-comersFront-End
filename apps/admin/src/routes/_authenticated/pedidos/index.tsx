import { createFileRoute } from '@tanstack/react-router'
import { OrdersScreen, ordersSearchSchema } from '../../../features/orders'

/**
 * Ruta `/pedidos`: la tabla de pedidos. `?estado=`, `?pago=` y `?pagina=` se validan con
 * `ordersSearchSchema` (lo que no sirve se descarta); la búsqueda por texto no va en la URL.
 */
export const Route = createFileRoute('/_authenticated/pedidos/')({
  validateSearch: ordersSearchSchema,
  component: OrdersPage,
})

function OrdersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { storeUrl } = Route.useRouteContext()
  return (
    <OrdersScreen
      search={search}
      onSearchChange={(next) => {
        void navigate({ search: next })
      }}
      storeUrl={storeUrl}
    />
  )
}
