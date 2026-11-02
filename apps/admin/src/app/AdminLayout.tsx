import type { ReactNode } from 'react'
import { ListIcon, XIcon } from '@phosphor-icons/react'
import { useIsMutating, useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Dialog as RadixDialog } from 'radix-ui'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { adminLogout, isApiError } from '@galpon/api-client'
import { adminDashboardQuery } from '@galpon/api-client/react'
import type { RouterContext } from '../features/auth'
import type { AdminSidebarProps } from './AdminSidebar'
import { Badge } from '../components/ui/Badge'
import { buttonClass } from '../components/ui/button-class'
import { cx } from '../components/ui/cx'
import { toast } from '../components/ui/toast'
import { SessionExpiredDialog, useSessionExpiredStore } from '../features/auth'
import { resetOrdersSearch } from '../features/orders'
import { AdminSidebar } from './AdminSidebar'
import { APP_COPY } from './app.copy'
import { QUIET_CSRF_REFRESH_META } from './query-client'
import { useFocusHeadingOnNavigate } from './use-focus-heading-on-navigate'

/** Cada cuánto se actualizan los contadores del menú (60 s). */
const COUNTERS_REFRESH_MS = 60_000

/** Props de {@link AdminLayout}. */
export interface AdminLayoutProps {
  /** El contexto del router: la API, la caché, el token CSRF, la tienda y el modo de prueba. */
  context: RouterContext
  /** Email de la sesión abierta. */
  email: string
  /** La pantalla. */
  children: ReactNode
}

/**
 * Estructura de las pantallas con sesión: enlace "Saltar al contenido"; desde 1024 px, barra
 * lateral fija de 240 px; debajo, barra superior pegada de 56 px con "Menú" (abre la barra
 * lateral en un cajón que se cierra al navegar), la marca y el aviso de modo. El contenido va en
 * `main#contenido` (`max-w-6xl`) y, al cambiar de ruta, el foco pasa al `h1` de la pantalla.
 * Incluye "Tu sesión venció" y "Cerrar sesión", que vacía la caché y la búsqueda de pedidos (si
 * falla, un solo toast: el `403` renueva el token CSRF sin su aviso propio).
 *
 * @param props - Ver {@link AdminLayoutProps}.
 */
export function AdminLayout({ context, email, children }: AdminLayoutProps): ReactNode {
  const { api, queryClient, setCsrfToken, storeUrl, mockStatus } = context
  const navigate = useNavigate()
  const [isMenuOpen, setMenuOpen] = useState(false)
  const closedByNavigation = useRef(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const mainRef = useFocusHeadingOnNavigate()
  const summary = useQuery({ ...adminDashboardQuery(api), refetchInterval: COUNTERS_REFRESH_MS })
  // Una escritura puede dejar el modo de prueba sin persistencia: al terminar, se vuelve a dibujar
  // y el aviso lee `mockStatus.isPersistent` de nuevo.
  useIsMutating()
  const logout = useMutation({
    mutationFn: async () => {
      try {
        await adminLogout(api)
      } catch (error) {
        // Una sesión que ya venció da igual: el objetivo es quedar afuera.
        if (!isApiError(error) || error.kind !== 'unauthorized') throw error
      }
      useSessionExpiredStore.getState().markLoggedOut()
      setCsrfToken(undefined)
      queryClient.clear()
      // La búsqueda de pedidos vive en memoria y puede tener emails y nombres.
      resetOrdersSearch()
      await navigate({ to: '/login' })
    },
    // Un `403` (token CSRF rotado) se avisa con "No pudimos cerrar la sesión…", no dos veces.
    meta: QUIET_CSRF_REFRESH_META,
    onError: () => {
      toast.error(APP_COPY.logoutFailed)
    },
  })

  function closeMenuOnNavigate() {
    closedByNavigation.current = true
    // El foco vuelve a "Menú" antes de que el router resuelva (o frene) la navegación: si la ruta
    // cambia, el hook lo lleva al `h1`; si no cambia (el enlace de la sección actual o
    // `UnsavedChangesGuard`), ya está en "Menú" y el diálogo de salida lo recupera al cerrarse.
    flushSync(() => {
      setMenuOpen(false)
    })
    menuTriggerRef.current?.focus()
  }

  const sidebarProps: AdminSidebarProps = {
    email,
    storeUrl,
    mockStatus,
    counters: summary.data,
    isLoggingOut: logout.isPending,
    onLogout: () => {
      logout.mutate()
    },
  }

  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="bg-surface text-foreground sr-only z-50 rounded-md px-4 py-2 shadow-md focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {APP_COPY.skipToContent}
      </a>

      <aside className="bg-surface border-divider fixed inset-y-0 left-0 z-30 hidden w-60 border-r shadow-sm lg:flex">
        <AdminSidebar {...sidebarProps} />
      </aside>

      <div className="lg:pl-60">
        <header className="bg-surface border-divider sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-2 sm:px-4 lg:hidden">
          <RadixDialog.Root open={isMenuOpen} onOpenChange={setMenuOpen}>
            <RadixDialog.Trigger ref={menuTriggerRef} className={buttonClass('ghost', 'md')}>
              <ListIcon size={18} weight="regular" aria-hidden="true" />
              {APP_COPY.openMenu}
            </RadixDialog.Trigger>
            <RadixDialog.Portal>
              <RadixDialog.Overlay className="bg-background/70 fixed inset-0 z-40 transition-opacity duration-150 ease-out motion-reduce:transition-none starting:opacity-0" />
              <RadixDialog.Content
                aria-describedby={undefined}
                onCloseAutoFocus={(event) => {
                  // Al navegar, el foco ya se puso en "Menú" (ver `closeMenuOnNavigate`): si no se
                  // cancela el autofoco, llegaría tarde y pisaría al `h1` de la pantalla nueva.
                  if (!closedByNavigation.current) return
                  closedByNavigation.current = false
                  event.preventDefault()
                }}
                className="bg-surface border-divider fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[calc(100%-3rem)] flex-col border-r shadow-lg transition-opacity duration-150 ease-out outline-none motion-reduce:transition-none starting:opacity-0"
              >
                <RadixDialog.Title className="sr-only">{APP_COPY.menuTitle}</RadixDialog.Title>
                <RadixDialog.Close
                  aria-label={APP_COPY.closeMenu}
                  className={cx(buttonClass('icon', 'md'), 'absolute top-2 right-2')}
                >
                  <XIcon size={18} weight="regular" aria-hidden="true" />
                </RadixDialog.Close>
                <AdminSidebar {...sidebarProps} onNavigate={closeMenuOnNavigate} />
              </RadixDialog.Content>
            </RadixDialog.Portal>
          </RadixDialog.Root>
          <span className="text-h5">{APP_COPY.brand}</span>
          {mockStatus !== null && (
            <Badge tone="accent" className="ml-auto">
              {APP_COPY.mockBadge}
            </Badge>
          )}
        </header>

        <main
          id="contenido"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-4 py-6 outline-none lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>

      <SessionExpiredDialog context={context} email={email} />
    </div>
  )
}
