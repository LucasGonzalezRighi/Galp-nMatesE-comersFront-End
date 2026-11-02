import type { Page } from '@playwright/test'
import { gotoStore, STORE_SCREENS } from '../support/store'
import { expect, test } from '../support/test'

/** Pantallas con apariciones y textos animados: inicio, tienda, ficha, kit, nosotros y preguntas. */
const ANIMATED = ['home', 'shop', 'product-imperial-premium', 'kit', 'about', 'faq']

/**
 * Los elementos que siguen escondidos esperando una animación: con `opacity: 0` o desplazados con
 * `translate` en su estilo en línea. El desplazamiento calculado con `calc(` es el de la píldora
 * "Ver detalle" de las tarjetas, que solo se muestra al pasar el mouse o con el foco.
 */
async function stillHidden(page: Page): Promise<string[]> {
  return await page
    .locator('[style]')
    .evaluateAll((elements) =>
      elements
        .map(
          (element) => `${element.tagName.toLowerCase()} :: ${element.getAttribute('style') ?? ''}`,
        )
        .filter(
          (line) => /opacity:\s*0(?![.\d])/.test(line) || /translate[XY]?\((?!calc|0)/.test(line),
        ),
    )
}

test.describe('tienda: movimiento reducido', () => {
  test.describe('con prefers-reduced-motion: reduce', () => {
    test.use({ reducedMotion: 'reduce' })

    for (const screen of STORE_SCREENS.filter((item) => ANIMATED.includes(item.name))) {
      test(`${screen.name}: todo el contenido está visible sin esperar una animación`, async ({
        page,
      }) => {
        await gotoStore(page, screen.path)
        await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible()
        await expect.poll(() => stillHidden(page)).toEqual([])
        // Bajar hasta el final no tiene que esconder ni revelar nada de golpe.
        await page.keyboard.press('End')
        await expect.poll(() => stillHidden(page)).toEqual([])
      })
    }

    test('navegar entre secciones no deja la cortina ni nada que tape la página', async ({
      page,
      isMobile,
    }) => {
      await gotoStore(page, '/')
      if (isMobile) {
        await page.getByRole('button', { name: 'Menú', exact: true }).click()
        await page
          .getByRole('dialog', { name: 'Menú' })
          .getByRole('link', { name: 'Tienda' })
          .click()
      } else {
        await page
          .getByRole('navigation', { name: 'Principal' })
          .getByRole('link', { name: 'Tienda' })
          .click()
      }
      await expect(page).toHaveURL('/tienda')
      await expect(page.getByRole('heading', { level: 1, name: 'Todo el catálogo' })).toBeVisible()
      // Si algo tapara la página, el clic no llegaría al botón.
      await page.getByRole('button', { name: /^Abrir carrito/ }).click({ timeout: 3000 })
      await expect(page.getByRole('dialog', { name: /^Carrito/ })).toBeVisible()
    })
  })

  test.describe('sin preferencia de movimiento', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('el detector de contenido escondido encuentra las apariciones pendientes del inicio', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      // Control del detector: con animaciones, lo que está debajo de la pantalla espera su aparición.
      await expect.poll(async () => (await stillHidden(page)).length).toBeGreaterThan(0)
    })
  })
})
