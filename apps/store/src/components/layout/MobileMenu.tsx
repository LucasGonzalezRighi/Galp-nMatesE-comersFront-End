'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { asRoute } from '../../lib/routes'
import { Reveal } from '../motion'
import { Dialog } from '../ui'
import { LAYOUT_COPY } from './layout.copy'
import { NAV_ITEMS } from './nav'

/** Retraso entre un link y el siguiente al aparecer, en milisegundos (spec 9.5). */
const STAGGER_MS = 50

/** Props de {@link MobileMenu}. */
export interface MobileMenuProps {
  /** Si el menú está abierto. */
  open: boolean
  /** Se llama al pedir el cierre (Escape, tocar un link o tocar fuera). */
  onClose: () => void
  /**
   * Dónde empieza el panel, en píxeles desde el borde superior de la ventana: el borde inferior
   * del encabezado (64 px con la página bajada; más si todavía se ve la barra superior).
   */
  top: number
}

/**
 * Menú del celular (por debajo de 1040 px, spec 9.5): una capa que cubre la pantalla desde el
 * borde inferior del encabezado, con los seis links en grande y aparición escalonada de 50 ms. El
 * encabezado queda por encima y a la vista (el diálogo `full` va debajo de él). Es un diálogo
 * accesible: foco atrapado, Escape lo cierra y se bloquea el scroll de la página.
 *
 * @param props - Ver {@link MobileMenuProps}.
 */
export function MobileMenu({ open, onClose, top }: MobileMenuProps): ReactNode {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={LAYOUT_COPY.menuTitle}
      hideTitle
      placement="full"
      unstyled
      className="pointer-events-none h-full w-full"
      backdropClassName="bg-transparent"
    >
      <nav
        aria-label={LAYOUT_COPY.menuTitle}
        className="bg-background/94 pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-y-auto px-[clamp(20px,5vw,64px)] py-8 backdrop-blur-[18px]"
        style={{ top }}
      >
        <ul className="flex flex-col gap-[6px]">
          {NAV_ITEMS.map((item, index) => (
            <Reveal key={item.key} as="li" kind="up" delay={index * STAGGER_MS}>
              <Link
                href={asRoute(item.href)}
                onClick={onClose}
                className="text-foreground block text-[34px] tracking-[-0.02em] no-underline"
              >
                {item.menuLabel}
              </Link>
            </Reveal>
          ))}
        </ul>
      </nav>
    </Dialog>
  )
}
