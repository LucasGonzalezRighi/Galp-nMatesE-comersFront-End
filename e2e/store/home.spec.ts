import type { Locator, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
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

/** La escala de un elemento según su `transform` calculado (1 si no lleva). */
async function scaleOf(locator: Locator): Promise<number> {
  return await locator.evaluate((element) => {
    const { transform } = getComputedStyle(element)
    return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a
  })
}

/** Lo que axe encuentra serio o crítico (WCAG 2.0 y 2.1, A y AA) dentro de `selector`. */
async function seriousViolations(page: Page, selector: string): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`)
}

/** Lleva la página a `stops` paradas del principio del paseo (puede tener decimales). */
async function scrollToStops(page: Page, stops: number): Promise<void> {
  await page.getByRole('region', STAGE).evaluate(
    (section, [value, count]) => {
      const box = section.getBoundingClientRect()
      const top = box.top + window.scrollY
      const span = (box.height - window.innerHeight) / count
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

    test('al bajar 2,6 paradas la tercera (el mate) es la actual y su título está a la vista', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      await scrollToStops(page, 2.6)
      const rail = page.getByRole('navigation', RAIL)
      await expect(rail.getByRole('button').nth(2)).toHaveAttribute('aria-current', 'true')
      await expect(rail.getByRole('button').nth(2)).toHaveText('El mate')
      const panel = page.locator('[data-stage-stop="2"]')
      await expect(panel).toHaveAttribute('data-current', 'true')
      await expect(panel).toHaveCSS('opacity', '1')
      await expect(
        page.getByRole('heading', { level: 2, name: /Tres piezas\.\s*Una ronda\./ }),
      ).toBeInViewport()
      expect(await horizontalOverflow(page)).toBe(0)
    })

    test('durante una parada, la capa del mundo que se ve es la de esa parada', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      await expect(page.locator('[data-world-stop]')).toHaveCount(STOPS)
      for (const [index, key] of [
        [0, 'yerba'],
        [2, 'pieces'],
        [4, 'ritual'],
      ] as const) {
        await scrollToStops(page, index + 0.25)
        const current = page.locator('[data-world-stop][data-current="true"]')
        await expect(current).toHaveAttribute('data-world-stop', key)
        await expect(current).toHaveCSS('opacity', '1')
        const others = page.locator(`[data-world-stop]:not([data-world-stop="${key}"])`)
        await expect(others).toHaveCount(STOPS - 1)
        for (const other of await others.all()) await expect(other).toHaveCSS('opacity', '0')
      }
    })

    test('tocar la quinta parada del raíl la deja como actual', async ({ page }) => {
      await gotoStore(page, '/')
      await scrollToStops(page, 0.2)
      const fifth = page.getByRole('navigation', RAIL).getByRole('button').nth(4)
      await fifth.click()
      await expect(fifth).toHaveAttribute('aria-current', 'true')
      await expect(page.locator('[data-stage-stop="4"]')).toHaveAttribute('data-current', 'true')
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
      await expect(page.locator('[data-stage-stop="1"]')).toHaveAttribute('data-current', 'true')
    })

    test('el documento no tiene scroll horizontal', async ({ page }) => {
      await gotoStore(page, '/')
      expect(await horizontalOverflow(page)).toBe(0)
    })

    test('la portada tiene de fondo el cuadro del mate, con hojas que caen y vapor', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const poster = page.locator('[data-hero-poster]')
      await expect(poster.locator('img[src*="pieces.jpg"]')).toBeVisible()
      await expect(poster.locator('[data-world-life="leaves"]')).toBeAttached()
      await expect(poster.locator('[data-world-life="steam"]')).toBeAttached()
      // Que terminen de aparecer la píldora, la bajada y los botones antes de medir el contraste.
      await page.waitForTimeout(1600)
      expect(await seriousViolations(page, '.home-hero')).toEqual([])
      expect(await horizontalOverflow(page)).toBe(0)
    })

    test('del mate a la bombilla la cámara entra por la boca del mate', async ({ page }) => {
      await gotoStore(page, '/')
      await expect(page.locator('[data-world-stop]')).toHaveCount(STOPS)
      // A mitad del deslizamiento del mate (tercera parada) a la bombilla.
      await scrollToStops(page, 2.775)
      const pieces = page.locator('[data-world-stop="pieces"] > div')
      await expect.poll(() => scaleOf(pieces)).toBeGreaterThan(1.3)
      const bombilla = page.locator('[data-world-stop="bombilla"] > div')
      await expect.poll(() => scaleOf(bombilla)).toBeLessThan(1)
      // Ya en la bombilla, su cuadro queda en su tamaño.
      await scrollToStops(page, 3.05)
      await expect.poll(() => scaleOf(bombilla)).toBeCloseTo(1, 1)
    })

    test('al terminar la ronda el mundo se funde a negro antes de la colección', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const fade = page.locator('[data-world-fade]')
      await scrollToStops(page, 5.2)
      await expect(fade).toHaveCSS('opacity', '0')
      await scrollToStops(page, 6)
      await expect(fade).toHaveCSS('opacity', '1')
    })
  })

  // El contenido de una parada crece con el ancho (el título escala con `vw`) y el panel no tiene
  // scroll interno: en ventanas anchas y bajas tiene que seguir entrando entre el header y el borde.
  for (const viewport of [
    { width: 1600, height: 750 },
    { width: 1920, height: 700 },
  ]) {
    test.describe(`en una ventana ancha y baja (${String(viewport.width)} × ${String(viewport.height)})`, () => {
      test.use({ viewport, reducedMotion: 'no-preference' })

      test('las paradas más altas entran enteras entre el header y el borde', async ({ page }) => {
        await gotoStore(page, '/')
        await expect(page.getByRole('region', STAGE)).toBeAttached()
        // La yerba (rótulo y tres productos) y el mate (tres productos) son las más altas.
        for (const index of [0, 2]) {
          await scrollToStops(page, index + 0.2)
          // Los paneles apilados entran subiendo 24 px: se mide cuando terminó de entrar.
          await expect(page.locator(`[data-stage-stop="${String(index)}"]`)).toHaveCSS(
            'opacity',
            '1',
          )
          const column = page.locator(`[data-stage-stop="${String(index)}"] > div > div`)
          const box = await column.boundingBox()
          if (box === null) throw new Error(`La parada ${String(index)} no tiene columna.`)
          expect(box.y).toBeGreaterThanOrEqual(64)
          expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
        }
      })
    })
  }

  test.describe('con menos movimiento (1440 × 900)', () => {
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

    test('la portada tiene el cuadro del mate, quieto: sin hojas ni vapor', async ({ page }) => {
      await gotoStore(page, '/')
      const poster = page.locator('[data-hero-poster]')
      await expect(poster.locator('img[src*="pieces.jpg"]')).toBeVisible()
      await expect(poster.locator('[data-world-life]')).toHaveCount(0)
    })

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

  test('la portada tiene el cuadro del mate de fondo, sin hojas ni vapor', async ({ page }) => {
    await gotoStore(page, '/')
    const poster = page.locator('[data-hero-poster]')
    await expect(poster.locator('img[src*="pieces.jpg"]')).toBeVisible()
    await expect(poster.locator('[data-world-life]')).toHaveCount(0)
  })
})
