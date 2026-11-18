import type { Page } from '@playwright/test'
import { gotoStore, INTRO_LAYER, settleIntro, STORE_SCREENS } from '../support/store'
import { expect, test } from '../support/test'

/**
 * Va a una página del encabezado: con el menú del celular abierto si la pantalla es angosta, y
 * con el link del encabezado si es de escritorio.
 */
async function goThroughHeader(page: Page, isMobile: boolean, label: string): Promise<void> {
  if (isMobile) {
    await page.getByRole('button', { name: 'Menú', exact: true }).click()
    await page.getByRole('dialog', { name: 'Menú' }).getByRole('link', { name: label }).click()
  } else {
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: label })
      .click()
  }
}

test.describe('tienda: navegación', () => {
  for (const screen of STORE_SCREENS) {
    test(`la pantalla ${screen.name} (${screen.path}) abre con su título`, async ({ page }) => {
      const response = await page.goto(screen.path)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible()
    })
  }

  test('el encabezado lleva a Tienda, Armá tu kit, Nosotros, Preguntas y Contacto', async ({
    page,
    isMobile,
  }) => {
    await gotoStore(page, '/')
    const stops = [
      { label: 'Tienda', url: '/tienda', heading: 'Todo el catálogo' },
      { label: 'Armá tu kit', url: '/kit', heading: /Tres pasos\./ },
      { label: 'Nosotros', url: '/nosotros', heading: /Dos socios\./ },
      {
        label: isMobile ? 'Preguntas frecuentes' : 'Preguntas',
        url: '/preguntas-frecuentes',
        heading: 'Preguntas frecuentes',
      },
      { label: 'Contacto', url: '/contacto', heading: 'Escribinos.' },
    ]
    for (const stop of stops) {
      await goThroughHeader(page, isMobile, stop.label)
      await expect(page).toHaveURL(stop.url)
      await expect(page.getByRole('heading', { level: 1, name: stop.heading })).toBeVisible()
      // El telón (Ruling MR-29) baja, navega y se abre: el próximo clic va con la página a la vista.
      await settleIntro(page)
    }
  })

  test('el logo vuelve al inicio', async ({ page }) => {
    await gotoStore(page, '/nosotros')
    await page.getByRole('link', { name: 'Galpón — inicio' }).click()
    await expect(page).toHaveURL('/')
    // Desde adentro del sitio el inicio no repite la intro: baja el telón con el logo (Ruling AI-3).
    await expect(page.locator(`${INTRO_LAYER}[data-mode="page"]`)).toBeAttached()
    await expect(page.locator(`${INTRO_LAYER}[data-mode="intro"]`)).toHaveCount(0)
    await settleIntro(page)
    await expect(
      page.getByRole('heading', { level: 1, name: /Encontrá\s*tu mate\./ }),
    ).toBeVisible()
  })

  test('en el menú de escritorio el hover no subraya: la línea queda para el activo y el teclado (Ruling AI-5)', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'En el celular el menú es otro (sin subrayado).')
    await gotoStore(page, '/tienda')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    /** El ancho de la línea de un link, en píxeles (0 si no está). */
    const underlineWidth = (name: string): Promise<number> =>
      nav
        .getByRole('link', { name })
        .locator('[aria-hidden="true"]')
        .evaluate((line) => line.getBoundingClientRect().width)
    const about = nav.getByRole('link', { name: 'Nosotros' })
    await about.hover()
    // La píldora de fondo sí aparece con el mouse encima.
    await expect
      .poll(() => about.evaluate((link) => getComputedStyle(link).backgroundColor))
      .not.toBe('rgba(0, 0, 0, 0)')
    // Pasada la transición (240 ms), la línea sigue sin crecer.
    await page.waitForTimeout(400)
    expect(await underlineWidth('Nosotros')).toBe(0)
    expect(await underlineWidth('Tienda')).toBeGreaterThan(10)
    // Con el teclado, el link enfocado sí se subraya.
    await page.mouse.move(0, 400)
    await about.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(about).toBeFocused()
    await expect.poll(() => underlineWidth('Nosotros')).toBeGreaterThan(10)
  })

  test('el link del botón de arrepentimiento va en el pie y lleva a la página (Ruling IC-1)', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    // Arriba ya no hay barra: el link queda solo en el pie (Lucas, 2026-11-03).
    const name = 'Botón de arrepentimiento'
    await expect(page.getByRole('banner').getByRole('link', { name })).toHaveCount(0)
    const link = page.getByRole('contentinfo').getByRole('link', { name })
    await link.scrollIntoViewIfNeeded()
    await expect(link).toBeInViewport()
    await link.click()
    await expect(page).toHaveURL('/arrepentimiento')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Botón de arrepentimiento' }),
    ).toBeVisible()
  })

  test('del catálogo se llega a la ficha de un producto y a la tienda de su línea', async ({
    page,
  }) => {
    await gotoStore(page, '/tienda')
    await page.getByRole('link', { name: 'Mate Imperial Premium' }).first().click()
    await expect(page).toHaveURL('/producto/mate-imperial-premium')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Mate Imperial Premium' }),
    ).toBeVisible()
    await page
      .getByRole('navigation', { name: 'Ruta de navegación' })
      .getByRole('link', { name: 'Imperiales' })
      .click()
    await expect(page).toHaveURL('/tienda/imperiales')
    await expect(page.getByRole('heading', { level: 1, name: 'Imperiales' })).toBeVisible()
  })

  test('un producto o una línea que no existen muestran el aviso y no rompen la página', async ({
    page,
  }) => {
    await page.goto('/producto/ABC')
    await expect(
      page.getByRole('heading', { level: 1, name: 'No encontramos ese producto.' }),
    ).toBeVisible()
    await page.goto('/producto/..%2F..')
    await expect(
      page.getByRole('heading', { level: 1, name: 'No encontramos ese producto.' }),
    ).toBeVisible()
    await page.goto('/tienda/no-existe')
    await expect(
      page.getByRole('heading', { level: 1, name: 'No encontramos esa página' }),
    ).toBeVisible()
    await page.goto('/ruta-que-no-existe')
    await expect(
      page.getByRole('heading', { level: 1, name: 'No encontramos esa página' }),
    ).toBeVisible()
  })
})
