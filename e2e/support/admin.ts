import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Email de la cuenta de prueba del dashboard (`VITE_MOCK_ADMIN_EMAIL` de `apps/admin/.env.example`). */
export const ADMIN_EMAIL = 'admin@galponmates.com.ar'

/** Contraseña de la cuenta de prueba del dashboard (`VITE_MOCK_ADMIN_PASSWORD` de `apps/admin/.env.example`). */
export const ADMIN_PASSWORD = 'galpon-demo-2026'

/** Una pantalla del dashboard que recorren las pruebas de accesibilidad, celular y control visual. */
export interface AdminScreen {
  /** Nombre corto, también el de la captura del control visual (`admin-{name}-{ancho}.png`). */
  name: string
  /** Ruta de la pantalla. */
  path: string
  /** Texto del `h1` que identifica la pantalla. */
  heading: string
}

/**
 * Las pantallas con sesión del dashboard, con el título de cada una. "Producto con fotos" es el
 * Mate Imperial Premium de los datos de prueba (`prd-imperial-premium`), que tiene fotos.
 */
export const ADMIN_SCREENS: readonly AdminScreen[] = [
  { name: 'dashboard', path: '/', heading: 'Resumen' },
  { name: 'products', path: '/productos', heading: 'Productos' },
  { name: 'product-new', path: '/productos/nuevo', heading: 'Nuevo producto' },
  {
    name: 'product-photos',
    path: '/productos/prd-imperial-premium',
    heading: 'Mate Imperial Premium',
  },
  { name: 'categories', path: '/lineas', heading: 'Líneas' },
  { name: 'orders', path: '/pedidos', heading: 'Pedidos' },
  { name: 'order', path: '/pedidos/GLP-09001', heading: 'Pedido GLP-09001' },
  { name: 'content-home', path: '/contenido/inicio', heading: 'Contenido' },
  { name: 'content-about', path: '/contenido/nosotros', heading: 'Contenido' },
  { name: 'content-faq', path: '/contenido/preguntas', heading: 'Contenido' },
  { name: 'content-tabs', path: '/contenido/pestanas', heading: 'Contenido' },
  { name: 'content-footer', path: '/contenido/pie', heading: 'Contenido' },
  { name: 'content-legal', path: '/contenido/legales', heading: 'Contenido' },
  { name: 'settings', path: '/ajustes', heading: 'Ajustes' },
  { name: 'reviews', path: '/resenas', heading: 'Reseñas' },
  { name: 'messages', path: '/mensajes', heading: 'Mensajes' },
  { name: 'account', path: '/cuenta', heading: 'Mi cuenta' },
]

/**
 * Lo que dura la sesión del administrador (8 h) más un minuto, en el formato de
 * `page.clock.fastForward`.
 */
export const PAST_SESSION = '08:01:00'

/**
 * Completa el formulario de ingreso y lo envía (sin esperar el resultado).
 *
 * @param page - Página de Playwright.
 * @param email - Email a ingresar.
 * @param password - Contraseña a ingresar.
 */
export async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

/**
 * Entra con las credenciales de prueba y espera a ver el resumen. Cada test abre un contexto
 * nuevo, así que arranca con una base de demostración recién sembrada.
 *
 * @param page - Página de Playwright.
 */
export async function logInAsAdmin(page: Page): Promise<void> {
  await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  await expect(screenHeading(page, 'Resumen')).toBeVisible()
}

/**
 * El `h1` de la pantalla.
 *
 * @param page - Página de Playwright.
 * @param name - Texto del título.
 * @returns El localizador del encabezado.
 */
export function screenHeading(page: Page, name: string): Locator {
  return page.getByRole('heading', { level: 1, name, exact: true })
}

/**
 * Abre una pantalla del dashboard (con la sesión ya iniciada) y espera a que termine de cargar: a
 * ver su `h1` y a que no quede ningún aviso de "Cargando…", ninguna tabla ocupada (`aria-busy`),
 * ningún `Skeleton` (`animate-pulse`) ni ninguna lista desplegable sin sus opciones (la línea de un
 * producto llega con su propia consulta).
 *
 * @param page - Página de Playwright.
 * @param screen - Ruta y título de la pantalla.
 */
export async function gotoAdmin(
  page: Page,
  screen: Pick<AdminScreen, 'path' | 'heading'>,
): Promise<void> {
  await page.goto(screen.path)
  await expect(screenHeading(page, screen.heading)).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /^Cargando/ })).toHaveCount(0)
  await expect(page.locator('[aria-busy="true"], .animate-pulse')).toHaveCount(0)
  await expect
    .poll(() =>
      page
        .locator('main select')
        .evaluateAll((selects) =>
          selects.every((select) => select instanceof HTMLSelectElement && select.length > 1),
        ),
    )
    .toBe(true)
}

/**
 * El enlace del menú principal, por su nombre accesible (con el contador, si tiene: "Pedidos, 3
 * para despachar").
 *
 * @param page - Página de Playwright.
 * @param name - Nombre accesible exacto del enlace.
 * @returns El localizador del enlace.
 */
export function navLink(page: Page, name: string): Locator {
  return page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name, exact: true })
}

/**
 * Un aviso (toast) del dashboard, por su texto exacto. Se busca por texto dentro de la región de
 * avisos y no por `role="status"`: Radix anuncia el aviso con una copia oculta durante un momento.
 *
 * @param page - Página de Playwright.
 * @param text - Texto del aviso.
 * @returns El localizador del aviso.
 */
export function toast(page: Page, text: string): Locator {
  return page.getByRole('region', { name: /^Avisos/ }).getByText(text, { exact: true })
}

/**
 * Hace vencer la sesión con la pantalla abierta y espera el diálogo de re-ingreso. La página tiene
 * que haber llamado a `page.clock.install()` antes de cargar.
 *
 * @param page - Página de Playwright, con la sesión iniciada.
 * @returns El localizador del diálogo "Tu sesión venció".
 */
export async function expireSession(page: Page): Promise<Locator> {
  await page.clock.fastForward(PAST_SESSION)
  // La primera consulta que llega con la sesión vencida (los contadores del menú se refrescan cada
  // minuto) abre el diálogo sin salir de la pantalla.
  const dialog = page.getByRole('dialog', { name: 'Tu sesión venció' })
  await expect(dialog).toBeVisible()
  return dialog
}
