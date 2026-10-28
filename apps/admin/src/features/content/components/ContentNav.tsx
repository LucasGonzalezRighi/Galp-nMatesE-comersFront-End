import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { CONTENT_COPY } from '../content.copy'
import { LEGAL_SEARCH_DEFAULTS } from '../legal-search'

/** Clases de cada enlace, con estilo de pestaña. */
const TAB_CLASS =
  'focus-visible:outline-accent -mb-px inline-flex min-h-9 shrink-0 items-center border-b-2 px-3 py-2 text-sm font-medium no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none'

/** Lo que cambia en la pestaña de la página actual. */
const ACTIVE_PROPS = { className: 'border-accent text-foreground' }

/** Lo que cambia en las otras pestañas. */
const INACTIVE_PROPS = { className: 'hover:text-foreground border-transparent text-neutral-400' }

/**
 * Navegación entre las páginas de Contenido ("Secciones del contenido"): enlaces con estilo de
 * pestaña; el de la página actual lleva `aria-current="page"` (lo pone `Link`).
 */
export function ContentNav(): ReactNode {
  return (
    <nav aria-label={CONTENT_COPY.navLabel}>
      <ul className="border-divider m-0 flex list-none gap-1 overflow-x-auto border-b p-0">
        <li>
          <Link
            to="/contenido/inicio"
            className={TAB_CLASS}
            activeProps={ACTIVE_PROPS}
            inactiveProps={INACTIVE_PROPS}
          >
            {CONTENT_COPY.nav.home}
          </Link>
        </li>
        <li>
          <Link
            to="/contenido/nosotros"
            className={TAB_CLASS}
            activeProps={ACTIVE_PROPS}
            inactiveProps={INACTIVE_PROPS}
          >
            {CONTENT_COPY.nav.about}
          </Link>
        </li>
        <li>
          <Link
            to="/contenido/preguntas"
            className={TAB_CLASS}
            activeProps={ACTIVE_PROPS}
            inactiveProps={INACTIVE_PROPS}
          >
            {CONTENT_COPY.nav.faq}
          </Link>
        </li>
        <li>
          <Link
            to="/contenido/pestanas"
            className={TAB_CLASS}
            activeProps={ACTIVE_PROPS}
            inactiveProps={INACTIVE_PROPS}
          >
            {CONTENT_COPY.nav.productTabs}
          </Link>
        </li>
        <li>
          <Link
            to="/contenido/pie"
            className={TAB_CLASS}
            activeProps={ACTIVE_PROPS}
            inactiveProps={INACTIVE_PROPS}
          >
            {CONTENT_COPY.nav.footer}
          </Link>
        </li>
        <li>
          <Link
            to="/contenido/legales"
            search={LEGAL_SEARCH_DEFAULTS}
            activeOptions={{ includeSearch: false }}
            className={TAB_CLASS}
            activeProps={ACTIVE_PROPS}
            inactiveProps={INACTIVE_PROPS}
          >
            {CONTENT_COPY.nav.legal}
          </Link>
        </li>
      </ul>
    </nav>
  )
}
