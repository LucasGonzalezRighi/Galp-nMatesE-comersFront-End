import type { Page } from '@playwright/test'
import { gotoStore, settleIntro } from '../support/store'
import { expect, test } from '../support/test'

/** La capa de la intro y del telón (la tapa del servidor antes de hidratar es otra). */
const LAYER = '[data-intro]'

/** Abre un link del menú: el del encabezado o, en el celular, el del menú. */
async function clickMenu(page: Page, isMobile: boolean, name: string): Promise<void> {
  if (isMobile) {
    await page.getByRole('button', { name: 'Menú', exact: true }).click()
    await page.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name }).click()
  } else {
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name }).click()
  }
}

/**
 * Empieza a anotar, en `data-seen-layers` de `<html>`, cada capa que aparece: su modo y su logo
 * (`page:done` es el telón con el logo; `intro:…`, la intro dibujada). Sigue anotando mientras la
 * navegación sea del lado del cliente (el mismo documento).
 */
async function recordLayers(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: string[] = []
    const note = (): void => {
      const layer = document.querySelector('[data-intro]')
      if (layer === null) return
      const entry = `${layer.getAttribute('data-mode') ?? ''}:${layer.getAttribute('data-logo') ?? ''}`
      if (seen.at(-1) === entry) return
      seen.push(entry)
      document.documentElement.dataset.seenLayers = seen.join(' ')
    }
    new MutationObserver(note).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-mode', 'data-logo', 'data-phase'],
    })
  })
}

/** Las capas que anotó {@link recordLayers}. */
async function seenLayers(page: Page): Promise<string[]> {
  const seen = await page.locator('html').getAttribute('data-seen-layers')
  return seen === null ? [] : seen.split(' ')
}

/** Espera a que se vaya la capa y comprueba que fue el telón con el logo, nunca la intro. */
async function expectCurtainWithLogo(page: Page): Promise<void> {
  await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 5000 })
  const seen = await seenLayers(page)
  expect(seen).toContain('page:done')
  expect(seen.filter((entry) => entry.startsWith('intro'))).toEqual([])
  await expect(page.getByRole('heading', { level: 1, name: 'Encontrá tu mate.' })).toBeVisible()
}

test.describe('tienda: intro y telón entre páginas (Rulings MR-29, AI-1 a AI-3)', () => {
  test.describe('con movimiento', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('la intro tapa el inicio, se abre en 4,4 s y deja ver la portada', async ({ page }) => {
      await gotoStore(page, '/', { intro: 'keep' })
      await expect(page.locator(LAYER)).toBeAttached()
      await expect(page.locator(LAYER)).toHaveAttribute('data-mode', 'intro')
      // 4,4 s de guion, más la hidratación y la carga de los trazos.
      await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 8000 })
      await expect(page.getByRole('heading', { level: 1, name: 'Encontrá tu mate.' })).toBeVisible()
      await expect(page.locator('main').first()).not.toHaveAttribute('inert')
    })

    test('una tecla salta la intro', async ({ page }) => {
      await gotoStore(page, '/', { intro: 'keep' })
      await expect(page.locator(LAYER)).toBeAttached()
      await page.keyboard.press('Escape')
      await expect(page.locator(LAYER)).toHaveAttribute('data-phase', 'opening')
      // La apertura dura 1,5 s; con dos inicios en 3D a la vez el reloj de la página se atrasa.
      await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 4500 })
    })

    test('ir a la tienda baja el telón y después muestra la tienda', async ({ page, isMobile }) => {
      // Salta la intro como la rueda (antes que se monte la capa, una tecla no la alcanzaba y el
      // clic del menú llegaba con la intro todavía en curso).
      await gotoStore(page, '/')

      await clickMenu(page, isMobile, 'Tienda')
      await expect(page.locator(LAYER)).toHaveAttribute('data-mode', 'page')
      await expect(page).toHaveURL('/tienda')
      await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 3000 })
      await expect(page.getByRole('heading', { level: 1, name: 'Todo el catálogo' })).toBeVisible()
    })
  })

  test.describe('volver al inicio desde adentro del sitio (Ruling AI-3)', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('"Inicio" del menú baja el telón con el logo y no arranca la intro', async ({
      page,
      isMobile,
    }) => {
      await gotoStore(page, '/tienda')
      await recordLayers(page)
      await clickMenu(page, isMobile, 'Inicio')
      await expect(page).toHaveURL('/')
      await expectCurtainWithLogo(page)
    })

    test('el logo desde otra página baja el mismo telón, sin intro', async ({ page }) => {
      await gotoStore(page, '/nosotros')
      await recordLayers(page)
      await page.getByRole('link', { name: 'Galpón — inicio' }).click()
      await expect(page).toHaveURL('/')
      await expectCurtainWithLogo(page)
    })

    test('el botón Atrás hacia el inicio muestra el telón con el logo, sin intro', async ({
      page,
      isMobile,
    }) => {
      await gotoStore(page, '/')
      await clickMenu(page, isMobile, 'Tienda')
      await expect(page).toHaveURL('/tienda')
      await settleIntro(page)
      await recordLayers(page)
      await page.goBack()
      await expect(page).toHaveURL('/')
      await expectCurtainWithLogo(page)
    })

    test('recargar el inicio sí dibuja la intro', async ({ page }) => {
      await gotoStore(page, '/nosotros')
      await page.getByRole('link', { name: 'Galpón — inicio' }).click()
      await expect(page).toHaveURL('/')
      await settleIntro(page)
      await page.reload()
      await expect(page.locator(`${LAYER}[data-mode="intro"]`)).toBeAttached()
      await expect(page.locator(LAYER)).toHaveCount(0, { timeout: 8000 })
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

      await clickMenu(page, isMobile, 'Tienda')
      await expect(page).toHaveURL('/tienda')
      await expect(page.locator(LAYER)).toHaveCount(0)
      await clickMenu(page, isMobile, 'Inicio')
      await expect(page).toHaveURL('/')
      await expect(page.locator(LAYER)).toHaveCount(0)
    })
  })
})
