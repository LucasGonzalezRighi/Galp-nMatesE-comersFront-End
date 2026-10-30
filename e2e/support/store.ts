import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Una pantalla de la tienda que recorren las pruebas de navegación, accesibilidad y control visual. */
export interface StoreScreen {
  /** Nombre corto, también el nombre del archivo de la captura del control visual. */
  name: string
  /** Ruta de la pantalla. */
  path: string
  /** Texto (o patrón) del `h1` que identifica la pantalla. */
  heading: RegExp | string
}

/** Las pantallas públicas de la tienda de P2, con el título de cada una. */
export const STORE_SCREENS: readonly StoreScreen[] = [
  { name: 'home', path: '/', heading: /Encontrá\s*tu mate\./ },
  { name: 'shop', path: '/tienda', heading: 'Todo el catálogo' },
  { name: 'shop-bombillones', path: '/tienda/bombillones', heading: 'Bombillones' },
  {
    name: 'product-imperial-premium',
    path: '/producto/mate-imperial-premium',
    heading: 'Mate Imperial Premium',
  },
  { name: 'kit', path: '/kit', heading: /Tres pasos\.\s*Una ronda completa\./ },
  { name: 'about', path: '/nosotros', heading: /Dos socios\.\s*Un galpón\./ },
  { name: 'faq', path: '/preguntas-frecuentes', heading: 'Preguntas frecuentes' },
  { name: 'contact', path: '/contacto', heading: 'Escribinos.' },
  { name: 'withdrawal', path: '/arrepentimiento', heading: 'Botón de arrepentimiento' },
  { name: 'terms', path: '/terminos', heading: 'Términos y condiciones' },
  { name: 'privacy', path: '/privacidad', heading: 'Política de privacidad' },
]

/** La capa de la intro del inicio y del telón entre páginas (Ruling MR-29). */
export const INTRO_LAYER = '[data-intro]'

/** Opciones de {@link gotoStore}. */
export interface GotoStoreOptions {
  /**
   * Qué hacer con la intro del inicio: `'skip'` (por defecto) la salta y espera a que se abra;
   * `'keep'` la deja correr (las pruebas de la propia intro).
   */
  intro?: 'keep' | 'skip'
}

/**
 * Espera a que no haya intro ni telón por encima de la página. Si la intro del inicio está
 * trazando, la salta como lo haría la rueda del mouse: un evento `wheel` despachado en `window`
 * (solo lo escucha el proveedor de la transición, no mueve el scroll ni cambia la modalidad de
 * entrada del navegador, así que `:focus-visible` sigue igual). Con menos movimiento no hay capa.
 *
 * @param page - Página de Playwright.
 */
export async function settleIntro(page: Page): Promise<void> {
  // La tapa del servidor se va cuando hidrata la intro, que ya pidió la capa en ese mismo cuadro.
  await expect(page.locator('[data-intro-cover]')).toHaveCount(0, { timeout: 10_000 })
  const layer = page.locator(INTRO_LAYER)
  await expect
    .poll(
      async () => {
        await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel')))
        return layer.count()
      },
      { timeout: 10_000 },
    )
    .toBe(0)
}

/**
 * Abre una ruta de la tienda y espera a que la página esté hidratada: a que React haya tomado el
 * botón del carrito del encabezado (está en todas las páginas). Sin esa espera, un clic rápido
 * sobre un botón podría llegar antes que su manejador, porque la tienda compilada sirve el HTML
 * antes de ejecutar el JavaScript. En el inicio, además, salta la intro (ver
 * {@link GotoStoreOptions}): las pruebas que no son de la intro arrancan con la portada a la vista.
 *
 * @param page - Página de Playwright.
 * @param path - Ruta de la tienda, por ejemplo `/tienda`.
 * @param options - Ver {@link GotoStoreOptions}.
 */
export async function gotoStore(
  page: Page,
  path: string,
  options: GotoStoreOptions = {},
): Promise<void> {
  await page.goto(path)
  const cartButton = page.getByRole('button', { name: /^Abrir carrito/ })
  await expect
    .poll(() =>
      cartButton.evaluate((element: object) =>
        Object.keys(element).some((key) => key.startsWith('__reactProps$')),
      ),
    )
    .toBe(true)
  if (options.intro !== 'keep' && new URL(page.url()).pathname === '/') await settleIntro(page)
}
