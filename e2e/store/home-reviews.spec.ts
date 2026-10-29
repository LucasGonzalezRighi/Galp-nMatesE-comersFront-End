import type { Locator, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Cuántas reseñas destacadas muestra el inicio: las tres del diseño y las dos nuevas. */
const REVIEWS = 5

/** La sección de las reseñas del inicio (la que el pie tapa al subir). */
function reviewsSection(page: Page): Locator {
  return page.locator('section[data-footer-curtain]')
}

/** El pie de página. */
function footer(page: Page): Locator {
  return page.locator('footer.site-footer')
}

/** Distancia desde el borde de arriba de la ventana hasta el borde de arriba de un elemento. */
async function topOf(locator: Locator): Promise<number> {
  return await locator.evaluate((element) => element.getBoundingClientRect().top)
}

/** Distancia desde el borde de arriba de la ventana hasta el borde de abajo de un elemento. */
async function bottomOf(locator: Locator): Promise<number> {
  return await locator.evaluate((element) => element.getBoundingClientRect().bottom)
}

/** Lleva la página a `y` píxeles del principio, sin desplazamiento suave, y espera un cuadro. */
async function scrollPageTo(page: Page, y: number): Promise<void> {
  await page.evaluate(async (top) => {
    window.scrollTo({ top, behavior: 'instant' })
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }, y)
}

/** Dónde empieza la sección de reseñas en el documento (antes de clavarse). */
async function documentTopOf(page: Page, locator: Locator): Promise<number> {
  await scrollPageTo(page, 0)
  return await locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
}

test.describe('tienda: las reseñas del inicio y el pie que sube', () => {
  test.describe('en escritorio (1440 × 900)', () => {
    test.skip(
      ({ isMobile }) => isMobile,
      'El pie que sube es de escritorio; el celular tiene su prueba.',
    )
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

    test('el carrusel muestra cinco reseñas y Siguiente cambia el punto actual', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const section = reviewsSection(page)
      await section.scrollIntoViewIfNeeded()

      const track = section.getByRole('list')
      await expect(track.getByRole('listitem')).toHaveCount(REVIEWS)
      await expect(section.getByRole('button', { name: /^Reseña \d de 5$/ })).toHaveCount(REVIEWS)

      // Con el mouse encima el avance automático se pausa: la prueba no compite con él.
      await track.hover()
      await section.getByRole('button', { name: 'Reseña 1 de 5' }).click()
      await expect(section.getByRole('button', { name: 'Reseña 1 de 5' })).toHaveAttribute(
        'aria-current',
        'true',
      )
      await expect(section.getByRole('button', { name: 'Anterior' })).toBeDisabled()

      await section.getByRole('button', { name: 'Siguiente' }).click()

      await expect(section.getByRole('button', { name: 'Reseña 2 de 5' })).toHaveAttribute(
        'aria-current',
        'true',
      )
      await expect(section.getByRole('button', { name: 'Reseña 1 de 5' })).not.toHaveAttribute(
        'aria-current',
      )
      await expect(section.locator('[aria-live="polite"]')).toHaveText('Reseña 2 de 5')
    })

    test('al bajar el pie sube por encima de las reseñas, que quedan quietas, y al final se ve GALPÓN', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const section = reviewsSection(page)
      const pageFooter = footer(page)
      const start = await documentTopOf(page, section)
      const viewport = page.viewportSize()
      if (viewport === null) throw new Error('La prueba necesita un tamaño de ventana.')

      // Dos posiciones dentro del tramo: la sección clavada arriba y el pie subiendo.
      await scrollPageTo(page, start + viewport.height * 0.25)
      const sectionTopBefore = await topOf(section)
      const footerTopBefore = await topOf(pageFooter)
      await scrollPageTo(page, start + viewport.height * 0.75)
      const sectionTopAfter = await topOf(section)
      const footerTopAfter = await topOf(pageFooter)

      expect(Math.abs(sectionTopAfter - sectionTopBefore)).toBeLessThan(1)
      expect(Math.abs(sectionTopAfter)).toBeLessThan(1)
      expect(footerTopAfter).toBeLessThan(footerTopBefore - viewport.height * 0.4)
      expect(footerTopAfter).toBeLessThan(await bottomOf(section))
      await expect(pageFooter).toHaveCSS('z-index', '20')

      await scrollPageTo(page, await page.evaluate(() => document.documentElement.scrollHeight))
      // Menos de un píxel: el alto de la página puede tener decimales y el scroll llega a un entero.
      expect(await topOf(pageFooter)).toBeLessThan(1)
      const lit = pageFooter.locator('[data-wordmark-layer="lit"]')
      await expect(lit).toBeInViewport()
      // Al final la palabra iluminada quedó entera: el recorte ya no tapa nada.
      await expect
        .poll(() => lit.evaluate((element) => element.style.clipPath))
        .toMatch(/^inset\(0(?:\.\d+)?(?:%|px)?[\s)]/)
    })
  })

  for (const { name, viewport, reducedMotion } of [
    {
      name: 'en el celular (390 × 844)',
      viewport: { width: 390, height: 844 },
      reducedMotion: 'no-preference',
    },
    {
      name: 'en escritorio con menos movimiento',
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    },
  ] as const) {
    test.describe(name, () => {
      test.use({ viewport, reducedMotion })

      test('el pie no se superpone a las reseñas, que no se clavan', async ({ page }) => {
        await gotoStore(page, '/')
        const section = reviewsSection(page)
        const pageFooter = footer(page)

        await expect(section).not.toHaveCSS('position', 'sticky')
        await expect(pageFooter).toHaveCSS('margin-top', '0px')
        await expect(page.locator('[data-footer-spacer]')).toBeHidden()
        await scrollPageTo(page, await page.evaluate(() => document.documentElement.scrollHeight))
        expect(await topOf(pageFooter)).toBeGreaterThanOrEqual((await bottomOf(section)) - 1)
        await expect(pageFooter.locator('[data-wordmark-layer="lit"]')).toBeInViewport()
      })
    })
  }
})
