import type { Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** La capa de la intro y del telón (la tapa del servidor antes de hidratar es otra). */
const LAYER = '[data-intro]'

/** Abre el link "Tienda" del menú: el del encabezado o, en el celular, el del menú. */
async function clickShop(page: Page, isMobile: boolean): Promise<void> {
  if (isMobile) {
    await page.getByRole('button', { name: 'Menú', exact: true }).click()
    await page.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name: 'Tienda' }).click()
  } else {
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Tienda' })
      .click()
  }
}

test.describe('tienda: intro y telón entre páginas (Ruling MR-29)', () => {
  test.describe('con movimiento', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('la intro tapa el inicio, se abre en 5 s y deja ver la portada', async ({ page }) => {
      await gotoStore(page, '/', { intro: 'keep' })
      await expect(page.locator(LAYER)).toBeAttached()
      await expect(page.locator(LAYER)).toHaveAttribute('data-mode', 'intro')
      // 5 s de guion, más la hidratación y la carga de los trazos.
      await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 7000 })
      await expect(page.getByRole('heading', { level: 1, name: 'Encontrá tu mate.' })).toBeVisible()
      await expect(page.locator('main').first()).not.toHaveAttribute('inert')
    })

    test('una tecla salta la intro', async ({ page }) => {
      await gotoStore(page, '/', { intro: 'keep' })
      await expect(page.locator(LAYER)).toBeAttached()
      await page.keyboard.press('Escape')
      await expect(page.locator(LAYER)).toHaveAttribute('data-phase', 'opening')
      // La apertura dura 1 s; con dos inicios en 3D a la vez el reloj de la página se atrasa.
      await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 3000 })
    })

    test('ir a la tienda baja el telón y después muestra la tienda', async ({ page, isMobile }) => {
      // Salta la intro como la rueda (antes que se monte la capa, una tecla no la alcanzaba y el
      // clic del menú llegaba con la intro todavía en curso).
      await gotoStore(page, '/')

      await clickShop(page, isMobile)
      await expect(page.locator(LAYER)).toHaveAttribute('data-mode', 'page')
      await expect(page).toHaveURL('/tienda')
      await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 3000 })
      await expect(page.getByRole('heading', { level: 1, name: 'Todo el catálogo' })).toBeVisible()
    })
  })

  test.describe('volver a Inicio (con movimiento)', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('"Inicio" del menú dibuja la intro entera y después muestra la portada', async ({
      page,
      isMobile,
    }) => {
      await gotoStore(page, '/tienda')
      if (isMobile) {
        await page.getByRole('button', { name: 'Menú', exact: true }).click()
        await page
          .getByRole('dialog', { name: 'Menú' })
          .getByRole('link', { name: 'Inicio' })
          .click()
      } else {
        await page
          .getByRole('navigation', { name: 'Principal' })
          .getByRole('link', { name: 'Inicio' })
          .click()
      }
      // El telón baja sin logo y la intro del inicio lo dibuja entero (Ruling MR-29).
      await expect(page.locator(`${LAYER}[data-mode="intro"]`)).toBeAttached()
      await expect(page).toHaveURL('/')
      await expect(page.locator(`${LAYER}[data-phase="drawing"]`)).toBeAttached()
      await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 7000 })
      await expect(page.getByRole('heading', { level: 1, name: 'Encontrá tu mate.' })).toBeVisible()
    })

    test('el logo desde otra página también dibuja la intro antes de la portada', async ({
      page,
    }) => {
      await gotoStore(page, '/nosotros')
      await page.getByRole('link', { name: 'Galpón — inicio' }).click()
      await expect(page.locator(`${LAYER}[data-mode="intro"]`)).toBeAttached()
      await expect(page).toHaveURL('/')
      await expect(page.locator(`${LAYER}[data-phase="drawing"]`)).toBeAttached()
      await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 7000 })
      await expect(page.getByRole('heading', { level: 1, name: 'Encontrá tu mate.' })).toBeVisible()
    })
  })

  test.describe('con prefers-reduced-motion: reduce', () => {
    test.use({ reducedMotion: 'reduce' })

    test('no hay intro ni telón', async ({ page, isMobile }) => {
      await gotoStore(page, '/', { intro: 'keep' })
      await expect(page.locator(LAYER)).toHaveCount(0)
      await expect(page.locator('[data-intro-cover]')).toHaveCount(0)
      await expect(page.getByRole('heading', { level: 1, name: 'Encontrá tu mate.' })).toBeVisible()

      await clickShop(page, isMobile)
      await expect(page).toHaveURL('/tienda')
      await expect(page.locator(LAYER)).toHaveCount(0)
    })
  })
})
