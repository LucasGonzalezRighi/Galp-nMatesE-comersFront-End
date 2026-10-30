import type { Locator, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Hileras completas que muestra la tienda antes de "Más productos" (Ruling MR-27). */
const ROWS = 4

/** Aire mínimo entre el final de la tienda y el pie: `clamp(96px, 10vw, 160px)`. */
const MIN_FOOTER_GAP = 96

/** Las tarjetas de la grilla de la tienda. */
function cards(page: Page): Locator {
  return page.locator('main [data-product-card]')
}

/** El pie de página. */
function footer(page: Page): Locator {
  return page.locator('footer.site-footer')
}

/** Cuántos productos tiene el catálogo, según el botón "Todos N" de las líneas. */
async function totalProducts(page: Page): Promise<number> {
  const all = page
    .getByRole('navigation', { name: 'Líneas de producto' })
    .getByRole('link', { name: /^Todos/ })
  const text = (await all.textContent()) ?? ''
  return Number(/\d+/.exec(text)?.[0] ?? Number.NaN)
}

/** Las columnas de la grilla de la tienda, contadas en su `grid-template-columns` calculado. */
async function gridColumns(page: Page): Promise<number> {
  return await cards(page)
    .first()
    .evaluate((card) => {
      const grid = card.closest('[class*="grid-cols-"]')
      if (grid === null) return 0
      return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
    })
}

/**
 * Cuántas hileras ocupa la grilla de arriba, por el `offsetTop` de sus ítems: no cambia con las
 * entradas de las tarjetas (que se corren con `transform` mientras aparecen).
 */
async function rowsOf(page: Page): Promise<number> {
  return await cards(page)
    .first()
    .evaluate((card) => {
      const grid = card.closest('[class*="grid-cols-"]')
      if (grid === null) return 0
      const tops = Array.from(grid.children, (item) =>
        item instanceof HTMLElement ? item.offsetTop : Number.NaN,
      )
      return new Set(tops).size
    })
}

/** Distancia en el documento hasta el borde de abajo de un elemento. */
async function documentBottomOf(locator: Locator): Promise<number> {
  return await locator.evaluate(
    (element) => element.getBoundingClientRect().bottom + window.scrollY,
  )
}

/** Distancia en el documento hasta el borde de arriba de un elemento. */
async function documentTopOf(locator: Locator): Promise<number> {
  return await locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
}

/** Espera a que un elemento deje de moverse (dos medidas seguidas iguales). */
async function waitUntilStill(locator: Locator): Promise<void> {
  let previous = Number.NaN
  await expect
    .poll(
      async () => {
        const now = await documentBottomOf(locator)
        const still = Math.abs(now - previous) < 0.5
        previous = now
        return still
      },
      { intervals: [150] },
    )
    .toBe(true)
}

/** Comprueba que la última tarjeta termina antes del pie, con el aire de la tienda en el medio. */
async function expectClearOfFooter(page: Page): Promise<void> {
  const last = cards(page).last()
  await last.scrollIntoViewIfNeeded()
  await waitUntilStill(last)
  const lastBottom = await documentBottomOf(last)
  const footerTop = await documentTopOf(footer(page))
  expect(lastBottom).toBeLessThan(footerTop)
  expect(footerTop - lastBottom).toBeGreaterThanOrEqual(MIN_FOOTER_GAP)
}

const VIEWPORTS = [
  { width: 1905, height: 950 },
  { width: 390, height: 844 },
] as const

for (const viewport of VIEWPORTS) {
  test.describe(`tienda: más productos a ${String(viewport.width)} × ${String(viewport.height)}`, () => {
    test.use({ viewport })

    test('muestra 4 hileras y el botón centrado; al tocarlo despliega el resto', async ({
      page,
    }) => {
      await gotoStore(page, '/tienda')
      const total = await totalProducts(page)
      const columns = await gridColumns(page)
      expect(columns).toBeGreaterThan(0)
      // El catálogo de prueba tiene más de 4 hileras a cualquier ancho.
      expect(total).toBeGreaterThan(ROWS * columns)

      await expect(cards(page)).toHaveCount(ROWS * columns)
      expect(await rowsOf(page)).toBe(ROWS)
      const more = page.getByRole('button', { name: 'Más productos' })
      await expect(more).toBeVisible()
      const gridCenter = await cards(page)
        .first()
        .evaluate((card) => {
          const area = card.closest('[class*="grid-cols-"]')?.getBoundingClientRect()
          return area === undefined ? Number.NaN : area.left + area.width / 2
        })
      const buttonCenter = await more.evaluate((button) => {
        const own = button.getBoundingClientRect()
        return own.left + own.width / 2
      })
      expect(Math.abs(buttonCenter - gridCenter)).toBeLessThanOrEqual(2)
      await expectClearOfFooter(page)

      await more.click()
      await expect(cards(page)).toHaveCount(total)
      await expect(more).toHaveCount(0)
      await expect(
        cards(page)
          .nth(ROWS * columns)
          .getByRole('link'),
      ).toBeFocused()
      await expectClearOfFooter(page)
    })
  })
}
