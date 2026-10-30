/**
 * Intro del inicio y transición entre páginas (Ruling MR-29): el matecito y GALPÓN se dibujan a
 * mano y la pantalla se abre como un libro. `PageTransitionProvider` va en el layout, `HomeIntro`
 * en el inicio y los links del menú llaman a `usePageTransition().onNavClick`.
 */
export { HomeIntro } from './HomeIntro'
export type { PageTransitionApi } from './intro-context'
export { usePageTransition } from './intro-context'
export { INTRO_COPY } from './intro.copy'
export { PageTransitionProvider } from './PageTransitionProvider'
export type { PageTransitionProviderProps } from './PageTransitionProvider'
