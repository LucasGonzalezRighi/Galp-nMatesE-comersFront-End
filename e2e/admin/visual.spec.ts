import type { Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ADMIN_SCREENS, expireSession, gotoAdmin, logInAsAdmin } from '../support/admin'
import { expect, test } from '../support/test'

/** Carpeta de las capturas, que se revisan a ojo contra `docs/design/admin/CHECKLIST-P4.md`. */
const OUTPUT_DIR = join('test-results', 'visual')

/** Anchos de la lista de control: escritorio y celular. */
const VIEWPORTS = [
  { label: '1440', width: 1440, height: 900 },
  { label: '390', width: 390, height: 844 },
] as const

/**
 * Guarda la captura `admin-{nombre}-{ancho}.png`, después de que carguen las fuentes y, si se ve la
 * barra lateral, los contadores del menú.
 *
 * @param page - Página en el estado a capturar.
 * @param name - Nombre de la pantalla.
 * @param label - Ancho de la ventana.
 * @param fullPage - Toda la página (pantallas) o solo la ventana (diálogos abiertos).
 */
async function capture(page: Page, name: string, label: string, fullPage = true): Promise<void> {
  await page.evaluate(() => document.fonts.ready)
  const nav = page.getByRole('navigation', { name: 'Principal' })
  if (await nav.isVisible()) {
    await expect(nav.getByRole('link', { name: /^Pedidos, / })).toBeVisible()
  }
  mkdirSync(OUTPUT_DIR, { recursive: true })
  await page.screenshot({ path: join(OUTPUT_DIR, `admin-${name}-${label}.png`), fullPage })
}

for (const viewport of VIEWPORTS) {
  test.describe(`dashboard: control visual a ${viewport.label} px (capturas)`, () => {
    // Movimiento reducido: los diálogos se capturan abiertos del todo, sin el fundido de Radix.
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
    })

    test('captura el ingreso', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
      await capture(page, 'login', viewport.label)
    })

    for (const screen of ADMIN_SCREENS) {
      test(`captura ${screen.name} (${screen.path})`, async ({ page }) => {
        await logInAsAdmin(page)
        await gotoAdmin(page, screen)
        await capture(page, screen.name, viewport.label)
      })
    }

    test('captura el diálogo de una línea nueva', async ({ page }) => {
      await logInAsAdmin(page)
      await gotoAdmin(page, { path: '/lineas', heading: 'Líneas' })
      await page.getByRole('button', { name: 'Nueva línea' }).click()
      await expect(page.getByRole('dialog', { name: 'Nueva línea' })).toBeVisible()
      await capture(page, 'categories-dialog', viewport.label, false)
    })

    test('captura el diálogo de despacho de un pedido', async ({ page }) => {
      await logInAsAdmin(page)
      await gotoAdmin(page, { path: '/pedidos/GLP-09001', heading: 'Pedido GLP-09001' })
      await page.getByRole('button', { name: 'Marcar como despachado' }).click()
      await expect(
        page.getByRole('dialog', { name: 'Despachar el pedido GLP-09001' }),
      ).toBeVisible()
      await capture(page, 'order-ship', viewport.label, false)
    })

    test('captura la página que no existe', async ({ page }) => {
      await logInAsAdmin(page)
      await page.goto('/no-existe')
      await expect(page.getByText('No encontramos esa página').first()).toBeVisible()
      await capture(page, 'not-found', viewport.label)
    })

    test('captura el diálogo de sesión vencida', async ({ page }) => {
      await page.clock.install()
      await logInAsAdmin(page)
      await gotoAdmin(page, { path: '/productos', heading: 'Productos' })
      await expireSession(page)
      await capture(page, 'session-expired', viewport.label, false)
    })

    if (viewport.label === '390') {
      test('captura el menú abierto', async ({ page }) => {
        await logInAsAdmin(page)
        await page.getByRole('button', { name: 'Menú', exact: true }).click()
        await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible()
        await capture(page, 'menu', viewport.label, false)
      })
    }
  })
}
