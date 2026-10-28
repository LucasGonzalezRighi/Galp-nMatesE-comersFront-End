import type { ReactNode } from 'react'
import { ArrowSquareOutIcon, SignOutIcon, UserCircleIcon } from '@phosphor-icons/react'
import { Link, useLocation } from '@tanstack/react-router'
import type { DashboardSummary } from '@galpon/api-client'
import type { MockStatus } from '../lib/api'
import type { NavCounter } from './nav-items'
import { Badge } from '../components/ui/Badge'
import { cx } from '../components/ui/cx'
import { APP_COPY } from './app.copy'
import { isSectionActive, NAV_ITEMS } from './nav-items'

/** Props de {@link AdminSidebar}. */
export interface AdminSidebarProps {
  /** Email de la sesión, abajo de todo. */
  email: string
  /** URL de la tienda, para "Ver tienda". */
  storeUrl: string
  /** Estado del modo de prueba, o `null` en vivo (sin aviso de modo). */
  mockStatus: MockStatus | null
  /** Contadores del resumen, o `undefined` mientras cargan. */
  counters: Pick<DashboardSummary, NavCounter> | undefined
  /** Si se está cerrando la sesión. */
  isLoggingOut: boolean
  /** Cierra la sesión. */
  onLogout: () => void
  /** Se llama al tocar un enlace interno (el cajón del celular se cierra). */
  onNavigate?: () => void
}

/** Clases comunes de cada entrada del menú y de las acciones de abajo. */
const ITEM_CLASS =
  'relative flex min-h-9 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm no-underline transition-colors motion-reduce:transition-none disabled:opacity-60'

/** Entrada activa: fondo `neutral-900` y filete izquierdo cobre. */
const ACTIVE_CLASS =
  'bg-neutral-900 text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent'

/** Entrada inactiva. */
const INACTIVE_CLASS = 'text-neutral-300 hover:bg-foreground/10 hover:text-foreground'

/** Props de cada ícono del menú: 18 px, `regular` y decorativo. */
const ICON_PROPS = { size: 18, weight: 'regular', 'aria-hidden': true } as const

/**
 * Contenido de la barra lateral del dashboard: la marca con "Admin" y el aviso del modo de prueba
 * ("Sin persistencia…" si los cambios se pierden al recargar), el menú con la sección activa
 * (`aria-current="page"`) y los contadores del resumen (no se muestran en 0 y forman parte del
 * nombre del enlace: "Pedidos, 3 para despachar"), y abajo el email, "Ver tienda", "Mi cuenta" y
 * "Cerrar sesión". La usan la barra fija de escritorio y el cajón del celular.
 *
 * @param props - Ver {@link AdminSidebarProps}.
 */
export function AdminSidebar({
  email,
  storeUrl,
  mockStatus,
  counters,
  isLoggingOut,
  onLogout,
  onNavigate,
}: AdminSidebarProps): ReactNode {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isAccountActive = isSectionActive('/cuenta', pathname)

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex flex-col gap-2 px-4 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-h5">{APP_COPY.brand}</span>
          <Badge tone="neutral">{APP_COPY.adminBadge}</Badge>
        </div>
        {mockStatus !== null && (
          <div className="flex flex-col items-start gap-1.5">
            <Badge tone="accent">{APP_COPY.mockBadge}</Badge>
            {!mockStatus.isPersistent && (
              <p className="text-xs text-neutral-400">{APP_COPY.notPersistent}</p>
            )}
          </div>
        )}
      </div>

      <nav aria-label={APP_COPY.navLabel} className="min-h-0 flex-1 overflow-y-auto px-2">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = isSectionActive(item.section, pathname)
            const count = item.counter === null ? 0 : (counters?.[item.counter] ?? 0)
            // Con contador, el nombre lo da `aria-label` ("Pedidos, 3 para despachar"): un texto
            // oculto suelto cambia de espacios según el navegador.
            const accessibleName =
              item.counter !== null && count > 0
                ? `${item.label}, ${APP_COPY.counters[item.counter](count)}`
                : undefined
            const Icon = item.icon
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.section === '/', includeSearch: false }}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={accessibleName}
                  onClick={onNavigate}
                  className={cx(ITEM_CLASS, isActive ? ACTIVE_CLASS : INACTIVE_CLASS)}
                >
                  <Icon {...ICON_PROPS} />
                  <span>{item.label}</span>
                  {accessibleName !== undefined && (
                    <Badge tone="accent" aria-hidden="true" className="ml-auto tabular-nums">
                      {count}
                    </Badge>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-divider flex flex-col gap-0.5 border-t p-2">
        <p className="truncate px-3 py-2 text-xs text-neutral-400" title={email}>
          {email}
        </p>
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(ITEM_CLASS, INACTIVE_CLASS)}
        >
          <ArrowSquareOutIcon {...ICON_PROPS} />
          {APP_COPY.viewStore}
        </a>
        <Link
          to="/cuenta"
          aria-current={isAccountActive ? 'page' : undefined}
          onClick={onNavigate}
          className={cx(ITEM_CLASS, isAccountActive ? ACTIVE_CLASS : INACTIVE_CLASS)}
        >
          <UserCircleIcon {...ICON_PROPS} />
          {APP_COPY.myAccount}
        </Link>
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={onLogout}
          className={cx(ITEM_CLASS, INACTIVE_CLASS)}
        >
          <SignOutIcon {...ICON_PROPS} />
          {isLoggingOut ? APP_COPY.loggingOut : APP_COPY.logout}
        </button>
      </div>
    </div>
  )
}
