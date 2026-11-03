/**
 * Estructura común de las páginas de la tienda (spec 9.2 y 9.5): encabezado con navegación y
 * carrito, menú del celular y pie de página (con el "Botón de arrepentimiento", Ruling IC-1).
 *
 * El buscador se abre con `openSearch` (ver `search-trigger.ts`): la feature de búsqueda lo
 * escucha con `useSearchOpen`, y así el layout no depende de ella.
 *
 * @packageDocumentation
 */
export type { NavItem, NavKey } from './nav'
export type { FooterViewProps } from './FooterView'
export type { MobileMenuProps } from './MobileMenu'
export type { NavLinksListProps } from './NavLinks'
export type { WordmarkProps } from './Wordmark'
export { Footer } from './Footer'
export { FooterView, formatCuit, sellerLines } from './FooterView'
export { Header } from './Header'
export { MobileMenu } from './MobileMenu'
export { activeNavKey, NAV_ITEMS } from './nav'
export { NavLinks, NavLinksList } from './NavLinks'
export { closeSearch, openSearch, useSearchOpen } from './search-trigger'
export { Wordmark } from './Wordmark'
