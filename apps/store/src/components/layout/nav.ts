/** Claves de los seis links del encabezado. */
export type NavKey = 'inicio' | 'tienda' | 'kit' | 'nosotros' | 'faq' | 'contacto'

/** Un link de la navegación principal. */
export interface NavItem {
  /** Clave del link, la que devuelve {@link activeNavKey}. */
  key: NavKey
  /** Ruta de la página. */
  href: string
  /** Texto en el encabezado de escritorio. */
  label: string
  /** Texto en el menú del celular, que tiene lugar para el nombre completo. */
  menuLabel: string
}

/** Los seis links de la navegación, en el orden del encabezado (spec 9.5). */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'inicio', href: '/', label: 'Inicio', menuLabel: 'Inicio' },
  { key: 'tienda', href: '/tienda', label: 'Tienda', menuLabel: 'Tienda' },
  { key: 'kit', href: '/kit', label: 'Armá tu kit', menuLabel: 'Armá tu kit' },
  { key: 'nosotros', href: '/nosotros', label: 'Nosotros', menuLabel: 'Nosotros' },
  {
    key: 'faq',
    href: '/preguntas-frecuentes',
    label: 'Preguntas',
    menuLabel: 'Preguntas frecuentes',
  },
  { key: 'contacto', href: '/contacto', label: 'Contacto', menuLabel: 'Contacto' },
]

/** Primer segmento de la ruta que corresponde a cada link; `producto` también es "Tienda". */
const KEY_BY_SEGMENT: Readonly<Record<string, NavKey>> = {
  '': 'inicio',
  tienda: 'tienda',
  producto: 'tienda',
  kit: 'kit',
  nosotros: 'nosotros',
  'preguntas-frecuentes': 'faq',
  contacto: 'contacto',
}

/**
 * Dice qué link de la navegación está activo para una ruta. "Tienda" queda activo también en la
 * ficha de un producto (`/producto/...`) y en las líneas (`/tienda/bombillones`).
 *
 * @param pathname - Ruta actual, por ejemplo `/tienda/bombillones`.
 * @returns La clave del link activo, o `null` si la ruta no es de ninguno (por ejemplo `/checkout`).
 */
export function activeNavKey(pathname: string): NavKey | null {
  const segment = pathname.split('/')[1] ?? ''
  return Object.hasOwn(KEY_BY_SEGMENT, segment) ? (KEY_BY_SEGMENT[segment] ?? null) : null
}
