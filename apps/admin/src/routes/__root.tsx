import type { ErrorComponentProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { createRootRouteWithContext, Link, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { isApiError } from '@galpon/api-client'
import type { RouterContext } from '../features/auth'
import { APP_COPY } from '../app/app.copy'
import { buttonClass } from '../components/ui/button-class'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Toaster } from '../components/ui/Toaster'
import { UI_COPY } from '../components/ui/ui.copy'

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

/** Props de {@link ScreenTitle}. */
interface ScreenTitleProps {
  /** Título de la pantalla: va en el `h1` y en `document.title`. */
  title: string
}

/**
 * `h1` oculto (con `tabIndex={-1}`, como el de `PageHeader`, para recibir el foco al navegar) de
 * una pantalla que muestra su título con `EmptyState` o `ErrorState`; pone `document.title` =
 * "{title} · Galpón Admin".
 */
function ScreenTitle({ title }: ScreenTitleProps): ReactNode {
  useEffect(() => {
    document.title = `${title}${UI_COPY.documentTitleSuffix}`
  }, [title])
  return (
    <h1 tabIndex={-1} className="sr-only">
      {title}
    </h1>
  )
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <ScreenTitle title={APP_COPY.notFoundTitle} />
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

function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <ScreenTitle title={APP_COPY.errorTitle} />
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
