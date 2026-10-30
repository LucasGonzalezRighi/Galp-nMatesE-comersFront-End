'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { ListIcon } from '@phosphor-icons/react/List'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/MagnifyingGlass'
import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { AccountButton } from '../../features/account'
import { CartButton } from '../../features/cart'
import { asRoute } from '../../lib/routes'
import { usePrefersReducedMotion, useScrollDirection } from '../motion'
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

/** Desde cuántos píxeles de scroll el encabezado se esconde al bajar. */
const HIDE_AFTER_PX = 80

/** Cuánto se espera, como mucho, a que el scroll suave llegue arriba antes de mover el foco. */
const FOCUS_WAIT_MS = 3000

/**
 * Lleva el foco al principio de la página (el `h1` del contenido, o el `main`) sin mover el
 * scroll, para que el teclado también vuelva arriba. Si no lo es, lo hace enfocable con
 * `tabIndex` -1 (fuera del orden de tabulación).
 *
 * Espera a que el scroll llegue arriba (y dos cuadros más, para que se pongan al día los valores
 * que dependen del scroll): el escenario del mate salta a la parada que recibe el foco, así que
 * enfocar el título a mitad de camino cortaría la subida. Si no llega (el usuario volvió a
 * bajar), no mueve el foco.
 */
function focusPageStartAtTop(): void {
  const started = performance.now()
  const focus = (): void => {
    const target =
      document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main')
    if (target === null || window.scrollY > 1) return
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1
    target.focus({ preventScroll: true })
  }
  const check = (): void => {
    if (window.scrollY > 1 && performance.now() - started < FOCUS_WAIT_MS) {
      requestAnimationFrame(check)
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(focus)
    })
  }
  requestAnimationFrame(check)
}

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
 * lectura (fuera del encabezado: queda aunque él se esconda).
 *
 * Al bajar más de 80 px se desliza hacia arriba (`translateY(-100%)`, 300 ms) y vuelve apenas se
 * sube ({@link useScrollDirection}); arriba de todo, con el menú abierto o con el foco adentro
 * siempre se ve. En el inicio, el logo no navega: sube todo con scroll suave (sin animar con menos
 * movimiento) y lleva el foco al principio (Ruling MR-17); el mate 3D vuelve a la portada solo,
 * porque su avance sale del scroll. En otra página lleva al inicio como cualquier link.
 */
export function Header(): ReactNode {
  const scrolled = useScrolled()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuTop, setMenuTop] = useState(HEADER_HEIGHT_PX)
  const [focusInside, setFocusInside] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const direction = useScrollDirection(HIDE_AFTER_PX)
  const hidden = direction === 'down' && !menuOpen && !focusInside

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
      // El menú empieza donde termina el encabezado (tapa la barra de arrepentimiento, que va
      // debajo). Si todavía está volviendo a bajar, se toma su alto entero.
      const box = headerRef.current?.getBoundingClientRect()
      setMenuTop(box === undefined ? HEADER_HEIGHT_PX : Math.max(box.bottom, box.height))
    }
    setMenuOpen(!menuOpen)
  }

  const goHome = (event: MouseEvent<HTMLAnchorElement>): void => {
    const newTab =
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    if (newTab || window.location.pathname !== '/') return
    event.preventDefault()
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    focusPageStartAtTop()
  }

  return (
    <>
      <ScrollProgress />
      <header
        ref={headerRef}
        data-hidden={hidden ? '' : undefined}
        className={cx(
          'ease-main sticky top-0 z-50 transition-[translate] duration-300 motion-reduce:transition-none',
          hidden && '-translate-y-full',
        )}
        onFocus={() => {
          setFocusInside(true)
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocusInside(false)
        }}
      >
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
        {/* Por debajo de 1040 px la navegación está oculta: sin los huecos de su columna, con
            menos aire entre los íconos y con el carrito solo con ícono bajo 410 px (CartButton),
            la fila entra en 320 px junto con el acceso a la cuenta. */}
        <div className="site-container relative grid h-16 grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] items-center min-[1040px]:gap-5">
          <Link
            href={asRoute('/')}
            aria-label={LAYOUT_COPY.homeLink}
            className="block w-[116px] flex-none"
            onClick={goHome}
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
          <div className="col-start-3 flex items-center gap-1 justify-self-end min-[1040px]:gap-[6px]">
            <IconButton aria-label={LAYOUT_COPY.search} aria-haspopup="dialog" onClick={openSearch}>
              <MagnifyingGlassIcon size={19} aria-hidden="true" />
            </IconButton>
            <AccountButton />
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
