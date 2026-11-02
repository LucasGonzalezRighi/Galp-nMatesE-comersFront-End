import { createFileRoute } from '@tanstack/react-router'
import { ProductScreen } from '../../../features/products'

/** Ruta `/productos/$id`: el formulario para editar un producto, con su código y sus fechas. */
export const Route = createFileRoute('/_authenticated/productos/$id')({
  component: ProductPage,
})

function ProductPage() {
  const { id } = Route.useParams()
  return <ProductScreen id={id} />
}
