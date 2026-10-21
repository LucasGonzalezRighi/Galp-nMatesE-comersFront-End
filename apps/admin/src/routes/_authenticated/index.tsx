import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { adminLogout, isApiError } from '@galpon/api-client'
import { adminProductsQuery } from '@galpon/api-client/react'

/** Ruta `/`: pantalla provisoria de inicio; la reemplaza el dashboard real en la fase P4. */
export const Route = createFileRoute('/_authenticated/')({
  component: Home,
})

function Home() {
  const { api, queryClient, setCsrfToken, mockStatus, session } = Route.useRouteContext()
  const navigate = useNavigate()
  const products = useQuery(adminProductsQuery(api, { page: 1, pageSize: 1 }))
  const logout = useMutation({
    mutationFn: async () => {
      try {
        await adminLogout(api)
      } catch (error) {
        // Una sesión que ya venció da igual: el objetivo es quedar afuera.
        if (!isApiError(error) || error.kind !== 'unauthorized') throw error
      }
      setCsrfToken(undefined)
      queryClient.clear()
      await navigate({ to: '/login' })
    },
  })

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      {mockStatus !== null && (
        <p role="status" className="bg-surface text-accent-300 rounded-md px-3 py-2 shadow-sm">
          Modo de prueba
          {!mockStatus.isPersistent && ' (sin persistencia: los cambios se pierden al recargar)'}
        </p>
      )}
      <h1>{`Hola, ${session.email}`}</h1>
      <p>
        {products.isPending && 'Cargando productos…'}
        {products.isError && 'No pudimos cargar los productos.'}
        {products.isSuccess && `Productos cargados: ${String(products.data.total)}`}
      </p>
      {logout.isError && (
        <p role="alert" className="text-danger">
          No pudimos cerrar la sesión, probá de nuevo.
        </p>
      )}
      <button
        type="button"
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate()
        }}
        className="bg-surface text-foreground self-start rounded-md px-4 py-2 shadow-md hover:bg-neutral-900 disabled:opacity-60"
      >
        Cerrar sesión
      </button>
    </main>
  )
}
