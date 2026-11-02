import type { Locator, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** El pie de página. */
function footer(page: Page): Locator {
  return page.locator('footer.site-footer')
}

/** Lleva la página al final y espera a que llegue (el alto puede cambiar mientras hidrata). */
async function scrollToEnd(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
        await new Promise((resolve) => requestAnimationFrame(resolve))
        return (
          document.documentElement.scrollHeight - window.innerHeight - Math.ceil(window.scrollY)
        )
      }),
    )
    .toBeLessThanOrEqual(1)
}

/**
 * Fuera del inicio el pie es sutil y va al final, en el flujo (Rulings MR-27 y MR-28): sin la
 * marca del inicio, sin margen negativo, sin borde en diagonal ni vidrio, debajo del contenido de
 * la página, con GALPÓN apagada y las filas que terminan de entrar al llegar al final.
 */
async function expectQuietFooterBelowContent(page: Page): Promise<void> {
  const root = page.locator('html')
  const pageFooter = footer(page)
  await expect(root).not.toHaveAttribute('data-footer-rise')
  await expect(root).not.toHaveAttribute('data-footer-home')
  await expect(pageFooter).toHaveCSS('margin-top', '0px')
  await expect(pageFooter).toHaveCSS('clip-path', 'none')
  await expect(pageFooter).toHaveCSS('backdrop-filter', 'none')
  await expect(pageFooter.locator('.site-footer-line')).toBeHidden()
  await expect(pageFooter.locator('[data-wordmark]')).toHaveCSS('opacity', '0.45')

  await scrollToEnd(page)
  // El contenido visible de la página (el inicio puede quedar oculto en el documento).
  const contentBottom = await page
    .locator('main:visible')
    .evaluate((element) => element.getBoundingClientRect().bottom)
  const footerTop = await pageFooter.evaluate((element) => element.getBoundingClientRect().top)
  expect(footerTop).toBeGreaterThanOrEqual(contentBottom - 1)
  await expect
    .poll(async () =>
      Math.min(
        ...(await pageFooter
          .locator('[data-footer-row]')
          .evaluateAll((rows) => rows.map((row) => Number(getComputedStyle(row).opacity)))),
      ),
    )
    .toBeGreaterThan(0.99)
}

test.describe('tienda: el pie de las demás páginas, sutil y al final (1440 × 900)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'El pie que sube (lo que no tiene que pasar) es de escritorio.',
  )
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

  for (const path of ['/tienda', '/producto/mate-imperial-premium', '/kit']) {
    test(`en ${path} el pie va debajo del contenido, sin cortina`, async ({ page }) => {
      await gotoStore(page, path)
      await expectQuietFooterBelowContent(page)
    })
  }

  test('del inicio a la tienda con un clic, el pie del inicio no sube sobre los productos', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    await expect(page.locator('html')).toHaveAttribute('data-footer-rise', '')
    await page.locator('header').getByRole('link', { name: 'Tienda', exact: true }).first().click()
    await page.waitForURL('**/tienda')
    await expect(page.getByRole('heading', { level: 1, name: 'Todo el catálogo' })).toBeVisible()
    await expectQuietFooterBelowContent(page)
  })

  test('en /kit el resumen clavado no queda debajo del pie', async ({ page }) => {
    await gotoStore(page, '/kit')
    await scrollToEnd(page)
    const summary = page.locator('main aside').first()
    const summaryBottom = await summary.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    const footerTop = await footer(page).evaluate((element) => element.getBoundingClientRect().top)
    expect(summaryBottom).toBeLessThanOrEqual(footerTop + 1)
  })
})
