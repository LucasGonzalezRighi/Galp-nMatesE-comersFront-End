import type { Page } from '@playwright/test'
import { gotoStore, settleIntro, STORE_SCREENS } from '../support/store'
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
    await expect(
      page.getByRole('heading', { level: 1, name: /Encontrá\s*tu mate\./ }),
    ).toBeVisible()
  })

  test('la barra superior de arrepentimiento está a la vista y lleva a la página', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const link = page.getByRole('link', { name: 'Botón de arrepentimiento' }).first()
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
