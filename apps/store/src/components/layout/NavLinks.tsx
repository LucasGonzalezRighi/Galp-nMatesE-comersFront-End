'use client'

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { asRoute } from '../../lib/routes'
import { cx } from '../ui/cx'
import { activeNavKey, NAV_ITEMS, type NavKey } from './nav'

/** Transición de cada link (la del diseño): color .3 s, fondo y salto .4 s con rebote. */
const LINK_TRANSITION: CSSProperties = {
  transitionProperty: 'color, background-color, translate',
  transitionDuration: '300ms, 400ms, 400ms',
  transitionTimingFunction: 'ease, ease, var(--ease-spring)',
}

/** Props de {@link NavLinksList}. */
export interface NavLinksListProps {
  /** Link activo, o `null` si ninguno. */
  activeKey: NavKey | null
}

/**
 * Los seis links del encabezado de escritorio, con el activo subrayado (la línea crece desde la
 * izquierda) y `aria-current="page"`. No lee la ruta: recibe cuál está activo.
 *
 * @param props - Ver {@link NavLinksListProps}.
 */
export function NavLinksList({ activeKey }: NavLinksListProps): ReactNode {
  return (
    <ul className="flex gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.key === activeKey
        return (
          <li key={item.key}>
            <Link
              href={asRoute(item.href)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'hover:bg-accent/16 hover:text-foreground relative block rounded-full px-[14px] py-2 text-[14px] whitespace-nowrap no-underline hover:-translate-y-[2px] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                active ? 'text-foreground' : 'text-neutral-300',
              )}
              style={LINK_TRANSITION}
            >
              {item.label}
              <span
                aria-hidden="true"
                className={cx(
                  'bg-accent ease-main absolute right-3 bottom-[2px] left-3 h-px origin-left transition-[scale] duration-500 motion-reduce:transition-none',
                  active ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Navegación principal del encabezado de escritorio: marca como activo el link de la ruta actual
 * ("Tienda" también en la ficha de producto). Lee `usePathname`, así que en el layout va dentro de
 * un `<Suspense>` (Cache Components) con {@link NavLinksList} sin activo como respaldo.
 */
export function NavLinks(): ReactNode {
  return <NavLinksList activeKey={activeNavKey(usePathname())} />
}
