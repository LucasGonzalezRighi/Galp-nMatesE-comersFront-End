import type { Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Nombre accesible de la sección del paseo del mate y de su raíl. */
const STAGE = { name: 'El paseo del mate' } as const
const RAIL = { name: 'Paradas del paseo' } as const

/** Cuántas paradas tiene el paseo con el contenido de fábrica. */
const STOPS = 6

/** Ancho del documento que sobra a los costados (0 si no hay scroll horizontal). */
async function horizontalOverflow(page: Page): Promise<number> {
  return await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

/** Lleva la página a `stops` paradas del principio del paseo (puede tener decimales). */
async function scrollToStops(page: Page, stops: number): Promise<void> {
  await page.getByRole('region', STAGE).evaluate(
    (section, [value, count]) => {
      const top = section.getBoundingClientRect().top + window.scrollY
      const span = (section.offsetHeight - window.innerHeight) / count
      window.scrollTo(0, top + value * span)
    },
    [stops, STOPS] as const,
  )
}

test.describe('tienda: el paseo del mate', () => {
  test.skip(({ isMobile }) => isMobile, 'El paseo es de escritorio; el celular tiene su prueba.')

  test.describe('en escritorio (1440 × 900)', () => {
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

    test('la historia es el paseo, con un raíl de seis paradas', async ({ page }) => {
      await gotoStore(page, '/')
      await expect(page.getByRole('region', STAGE)).toBeAttached()
      const rail = page.getByRole('navigation', RAIL)
      await expect(rail.getByRole('button')).toHaveCount(STOPS)
      await expect(rail.getByRole('button').first()).toHaveAttribute('aria-current', 'true')
    })

    test('al bajar 2,6 paradas la tercera es la actual y su título está a la vista', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      await scrollToStops(page, 2.6)
      const rail = page.getByRole('navigation', RAIL)
      await expect(rail.getByRole('button').nth(2)).toHaveAttribute('aria-current', 'true')
      await expect(
        page.getByRole('heading', { level: 2, name: /Alpaca\s*y bronce/ }),
      ).toBeInViewport()
      expect(await horizontalOverflow(page)).toBe(0)
    })

    test('tocar la quinta parada del raíl la deja como actual', async ({ page }) => {
      await gotoStore(page, '/')
      await scrollToStops(page, 0.2)
      const fifth = page.getByRole('navigation', RAIL).getByRole('button').nth(4)
      await fifth.click()
      await expect(fifth).toHaveAttribute('aria-current', 'true')
      await expect(page.getByRole('heading', { level: 2, name: /Agua a 75/ })).toBeInViewport()
    })

    test('con Tab hasta un enlace de la segunda parada, la parada viene a la vista', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const first = page.locator('[data-stage-stop="0"]')
      await first
        .getByRole('button', { name: /^Agregar .+ al carrito$/ })
        .last()
        .focus()
      await page.keyboard.press('Tab')
      const link = page.locator('[data-stage-stop="1"]').getByRole('link', { name: 'Ver mates' })
      await expect(link).toBeFocused()
      await expect(link).toBeInViewport()
      await expect(page.getByRole('navigation', RAIL).getByRole('button').nth(1)).toHaveAttribute(
        'aria-current',
        'true',
      )
    })

    test('el documento no tiene scroll horizontal', async ({ page }) => {
      await gotoStore(page, '/')
      expect(await horizontalOverflow(page)).toBe(0)
    })
  })

  test.describe('con menos movimiento (1440 × 900)', () => {
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

    test('no hay paseo ni raíl y todo el texto de las escenas está visible', async ({ page }) => {
      await gotoStore(page, '/')
      await expect(page.locator('.home-scene')).toHaveCount(STOPS)
      await expect(page.getByRole('region', STAGE)).toHaveCount(0)
      await expect(page.getByRole('navigation', RAIL)).toHaveCount(0)
      const hidden = await page
        .locator('.home-scene *')
        .evaluateAll(
          (elements) =>
            elements.filter((element) => getComputedStyle(element).opacity === '0').length,
        )
      expect(hidden).toBe(0)
    })
  })
})

test.describe('tienda: la historia en el celular (390 × 844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('las escenas están apiladas, sin raíl y sin scroll horizontal', async ({ page }) => {
    await gotoStore(page, '/')
    await expect(page.locator('.home-scene')).toHaveCount(STOPS)
    await expect(page.getByRole('navigation', RAIL)).toHaveCount(0)
    expect(await horizontalOverflow(page)).toBe(0)
  })
})
