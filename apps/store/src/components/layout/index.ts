/**
 * Estructura común de las páginas de la tienda (spec 9.2 y 9.5): barra superior de
 * arrepentimiento, encabezado con navegación y carrito, menú del celular y pie de página.
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
export { TopBar } from './TopBar'
export { Wordmark } from './Wordmark'
