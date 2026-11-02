import type { Icon } from '@phosphor-icons/react'
import {
  ArticleIcon,
  EnvelopeSimpleIcon,
  GearSixIcon,
  PackageIcon,
  ReceiptIcon,
  SquaresFourIcon,
  StackIcon,
  StarIcon,
} from '@phosphor-icons/react'
import type { DashboardSummary } from '@galpon/api-client'
import type { FileRouteTypes } from '../routeTree.gen'
import { APP_COPY } from './app.copy'

/** Ruta del admin sin parámetros, a la que lleva una entrada del menú. */
export type NavPath = Exclude<FileRouteTypes['to'], `${string}$${string}`>

/** Contador del resumen que puede llevar una entrada del menú. */
export type NavCounter = keyof Pick<
  DashboardSummary,
  'ordersToShip' | 'pendingReviews' | 'unreadMessages'
>

/** Una entrada del menú de la barra lateral. */
export interface NavItem {
  /** Adónde lleva. */
  to: NavPath
  /** Texto visible. */
  label: string
  /** Ícono de Phosphor. */
  icon: Icon
  /** Prefijo de las rutas en las que la entrada queda activa (`/` solo en el inicio). */
  section: string
  /** Contador del resumen que muestra, o `null`. */
  counter: NavCounter | null
}

/** El menú del dashboard, en orden. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: APP_COPY.nav.home, icon: SquaresFourIcon, section: '/', counter: null },
  {
    to: '/pedidos',
    label: APP_COPY.nav.orders,
    icon: ReceiptIcon,
    section: '/pedidos',
    counter: 'ordersToShip',
  },
  {
    to: '/productos',
    label: APP_COPY.nav.products,
    icon: PackageIcon,
    section: '/productos',
    counter: null,
  },
  {
    to: '/lineas',
    label: APP_COPY.nav.categories,
    icon: StackIcon,
    section: '/lineas',
    counter: null,
  },
  {
    to: '/contenido/inicio',
    label: APP_COPY.nav.content,
    icon: ArticleIcon,
    section: '/contenido',
    counter: null,
  },
  {
    to: '/resenas',
    label: APP_COPY.nav.reviews,
    icon: StarIcon,
    section: '/resenas',
    counter: 'pendingReviews',
  },
  {
    to: '/mensajes',
    label: APP_COPY.nav.messages,
    icon: EnvelopeSimpleIcon,
    section: '/mensajes',
    counter: 'unreadMessages',
  },
  {
    to: '/ajustes',
    label: APP_COPY.nav.settings,
    icon: GearSixIcon,
    section: '/ajustes',
    counter: null,
  },
]

/**
 * Dice si una sección del menú está activa en una ruta: `/` solo en el inicio; el resto, en su
 * ruta y en las que cuelgan de ella (`/pedidos/GLP-09001` activa "Pedidos").
 *
 * @param section - Prefijo de la sección, por ejemplo `/contenido`.
 * @param pathname - Ruta actual, sin búsqueda.
 * @returns `true` si la sección está activa.
 * @throws {RangeError} Si `section` no empieza con `/`.
 */
export function isSectionActive(section: string, pathname: string): boolean {
  if (!section.startsWith('/')) {
    throw new RangeError(`La sección del menú tiene que empezar con "/"; se recibió "${section}".`)
  }
  if (section === '/') return pathname === '/'
  return pathname === section || pathname.startsWith(`${section}/`)
}
