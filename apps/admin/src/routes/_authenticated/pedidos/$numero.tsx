import { createFileRoute } from '@tanstack/react-router'
import { OrderScreen } from '../../../features/orders'

/** Ruta `/pedidos/$numero`: el detalle de un pedido, con sus acciones. */
export const Route = createFileRoute('/_authenticated/pedidos/$numero')({
  component: OrderPage,
})

function OrderPage() {
  const { numero } = Route.useParams()
  return <OrderScreen number={numero} />
}
