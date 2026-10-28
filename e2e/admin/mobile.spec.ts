import type { Page } from '@playwright/test'
import { ADMIN_SCREENS, gotoAdmin, logInAsAdmin, navLink, screenHeading } from '../support/admin'
import { expect, test } from '../support/test'

/** Cuánto se pasa la página del ancho de la ventana, en píxeles (0 o menos: sin scroll horizontal). */
async function horizontalOverflow(page: Page): Promise<number> {
  return await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

// El mismo proyecto de escritorio, con la ventana de un celular: debajo de 1024 px la barra
// lateral se esconde y "Menú" la abre en un cajón.
test.use({ viewport: { width: 390, height: 844 } })

test.describe('dashboard: celular (390 px)', () => {
  test('"Menú" abre la barra lateral en un cajón y navega', async ({ page }) => {
    await logInAsAdmin(page)
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeHidden()
    await page.getByRole('button', { name: 'Menú', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Menú' })
    await expect(drawer).toBeVisible()
    await navLink(page, 'Pedidos, 3 para despachar').click()
    await expect(screenHeading(page, 'Pedidos')).toBeVisible()
    await expect(drawer).toBeHidden()
    await expect(screenHeading(page, 'Pedidos')).toBeFocused()
  })

  test('el ingreso no tiene scroll horizontal', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })

  for (const screen of ADMIN_SCREENS) {
    test(`${screen.name} (${screen.path}) no tiene scroll horizontal`, async ({ page }) => {
      await logInAsAdmin(page)
      await gotoAdmin(page, screen)
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
    })
  }

  test('la página que no existe no tiene scroll horizontal', async ({ page }) => {
    await logInAsAdmin(page)
    await page.goto('/no-existe')
    await expect(page.getByText('No encontramos esa página').first()).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})
