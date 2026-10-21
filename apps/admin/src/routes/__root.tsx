import { createRootRouteWithContext, Link, Outlet, useRouter } from '@tanstack/react-router'
import { isApiError } from '@galpon/api-client'
import type { RouterContext } from '../features/auth'

/** Ruta raíz: da el contexto del router a todas las rutas y define el 404 y la pantalla de error. */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1>No encontramos esa página</h1>
      <Link to="/" className="text-accent-400 underline">
        Volver al inicio
      </Link>
    </main>
  )
}

function RouteError({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1>Algo salió mal</h1>
      <p role="alert" className="text-danger">
        {isApiError(error) ? error.message : 'Ocurrió un error inesperado.'}
      </p>
      <button
        type="button"
        onClick={() => {
          void router.invalidate()
        }}
        className="bg-accent-500 text-background hover:bg-accent-400 self-start rounded-md px-4 py-2 font-medium"
      >
        Reintentar
      </button>
    </main>
  )
}
