import { createFileRoute } from '@tanstack/react-router'
import { ProductsScreen, productsSearchSchema } from '../../../features/products'

/**
 * Ruta `/productos`: la tabla de productos. `?q=`, `?linea=`, `?estado=`, `?sinStock=`, `?orden=`
 * y `?pagina=` se validan con `productsSearchSchema` (lo que no sirve se descarta).
 */
export const Route = createFileRoute('/_authenticated/productos/')({
  validateSearch: productsSearchSchema,
  component: ProductsPage,
})

function ProductsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { storeUrl } = Route.useRouteContext()
  return (
    <ProductsScreen
      search={search}
      onSearchChange={(next) => {
        void navigate({ search: next })
      }}
      storeUrl={storeUrl}
    />
  )
}
