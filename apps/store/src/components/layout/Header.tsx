'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ListIcon } from '@phosphor-icons/react/List'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/MagnifyingGlass'
import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { CartButton } from '../../features/cart'
import { asRoute } from '../../lib/routes'
import { IconButton } from '../ui'
import { cx } from '../ui/cx'
import { LAYOUT_COPY } from './layout.copy'
import { MobileMenu } from './MobileMenu'
import { NavLinks, NavLinksList } from './NavLinks'
import { ScrollProgress } from './ScrollProgress'
import { openSearch } from './search-trigger'
import { useScrolled } from './use-scrolled'
import { Wordmark } from './Wordmark'

/** Ancho a partir del cual el encabezado muestra los seis links en lugar de la hamburguesa. */
const WIDE_QUERY = '(min-width: 1040px)'

/** Alto del encabezado, en píxeles. */
const HEADER_HEIGHT_PX = 64

/** Línea inferior del vidrio, con los extremos desvanecidos. */
const GLASS_LINE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)',
}

/**
 * Encabezado fijo de la tienda (spec 9.5): logo, los seis links desde 1040 px (con "Tienda"
 * también activo en la ficha de producto), la lupa (abre el buscador con `openSearch`), el botón
 * del carrito con su contador y, por debajo de 1040 px, la hamburguesa que abre el menú. Pasados
 * los 8 px de scroll aparece un fondo de vidrio, y arriba de todo corre la barra de progreso de
 * lectura.
 */
export function Header(): ReactNode {
  const scrolled = useScrolled()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuTop, setMenuTop] = useState(HEADER_HEIGHT_PX)
  const headerRef = useRef<HTMLElement>(null)

  // Si la ventana se ensancha con el menú abierto, ya no hay hamburguesa: se cierra.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const wide = window.matchMedia(WIDE_QUERY)
    const onChange = (): void => {
      if (wide.matches) setMenuOpen(false)
    }
    wide.addEventListener('change', onChange)
    return () => {
      wide.removeEventListener('change', onChange)
    }
  }, [])

  const toggleMenu = (): void => {
    if (!menuOpen) {
      // El menú empieza donde termina el encabezado: con la barra superior a la vista, más abajo.
      setMenuTop(headerRef.current?.getBoundingClientRect().bottom ?? HEADER_HEIGHT_PX)
    }
    setMenuOpen(!menuOpen)
  }

  return (
    <>
      <ScrollProgress />
      <header ref={headerRef} className="sticky top-0 z-50">
        <div
          aria-hidden="true"
          data-glass=""
          className={cx(
            'bg-background/74 absolute inset-0 backdrop-blur-[16px] backdrop-saturate-[1.2] transition-opacity duration-400',
            scrolled ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="absolute inset-x-0 bottom-0 h-px" style={GLASS_LINE} />
        </div>
        <div className="relative mx-auto grid h-16 max-w-[1280px] grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] items-center gap-5 px-[clamp(20px,5vw,64px)]">
          <Link
            href={asRoute('/')}
            aria-label={LAYOUT_COPY.homeLink}
            className="block w-[116px] flex-none"
          >
            <Wordmark style={{ background: 'var(--color-foreground)' }} />
          </Link>
          <nav
            aria-label={LAYOUT_COPY.mainNavigation}
            className="hidden justify-self-center min-[1040px]:block"
          >
            <Suspense fallback={<NavLinksList activeKey={null} />}>
              <NavLinks />
            </Suspense>
          </nav>
          <div className="col-start-3 flex items-center gap-[6px] justify-self-end">
            <IconButton aria-label={LAYOUT_COPY.search} aria-haspopup="dialog" onClick={openSearch}>
              <MagnifyingGlassIcon size={19} aria-hidden="true" />
            </IconButton>
            <CartButton />
            <IconButton
              aria-label={LAYOUT_COPY.openMenu}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className="min-[1040px]:hidden"
              onClick={toggleMenu}
            >
              <ListIcon size={20} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      </header>
      <MobileMenu
        open={menuOpen}
        top={menuTop}
        onClose={() => {
          setMenuOpen(false)
        }}
      />
    </>
  )
}
