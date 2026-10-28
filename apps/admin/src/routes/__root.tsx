import { createRootRouteWithContext, Link, Outlet, useRouter } from '@tanstack/react-router'
import { isApiError } from '@galpon/api-client'
import type { RouterContext } from '../features/auth'
import { APP_COPY } from '../app/app.copy'
import { buttonClass } from '../components/ui/button-class'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Toaster } from '../components/ui/Toaster'

/**
 * Ruta raíz: da el contexto del router a todas las rutas, monta los avisos (`Toaster`) y define
 * el 404 y la pantalla de error.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  )
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <EmptyState
        title={APP_COPY.notFoundTitle}
        action={
          <Link to="/" className={buttonClass('secondary', 'md')}>
            {APP_COPY.backHome}
          </Link>
        }
      />
    </main>
  )
}

function RouteError({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <ErrorState
        title={APP_COPY.errorTitle}
        description={isApiError(error) ? error.message : APP_COPY.unexpectedError}
        onRetry={() => {
          void router.invalidate()
        }}
      />
    </main>
  )
}
