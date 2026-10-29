import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Nombre accesible de la sección del mate 3D y de su raíl. */
const STAGE = { name: 'El mate', exact: true } as const
const RAIL = { name: 'Paradas del mate' } as const

/** Cuántas paradas tiene el mate 3D. */
const STOPS = 3

/** Las escenas que quedan apiladas en el celular y con menos movimiento. */
const STACKED_SCENES = 2

/** Ancho del documento que sobra a los costados (0 si no hay scroll horizontal). */
async function horizontalOverflow(page: Page): Promise<number> {
  return await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
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

/** Lleva la página a `stops` paradas del principio del mate 3D (puede tener decimales). */
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

/** La parada (desde 0) del elemento que tiene el foco, o `null` si no está en una. */
async function focusedStop(page: Page): Promise<string | null> {
  return await page.evaluate(
    () =>
      document.activeElement?.closest('[data-stage-stop]')?.getAttribute('data-stage-stop') ?? null,
  )
}

test.describe('tienda: el mate 3D del inicio', () => {
  test.skip(({ isMobile }) => isMobile, 'El mate 3D es de escritorio; el celular tiene su prueba.')

  test.describe('en escritorio (1440 × 900)', () => {
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

    test('el inicio es el mate 3D: raíl de tres paradas y el lienzo montado, sin foto de respaldo', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const stage = page.getByRole('region', STAGE)
      await expect(stage).toBeAttached()
      const rail = page.getByRole('navigation', RAIL)
      await expect(rail.getByRole('button')).toHaveText(['El mate', 'La bombilla', 'El agua'])
      await expect(rail.getByRole('button').first()).toHaveAttribute('aria-current', 'true')
      // Chromium sin GPU dibuja con SwiftShader: la escena se crea y el lienzo toma el tamaño de la ventana.
      const canvas = stage.locator('canvas[aria-hidden="true"]')
      await expect(canvas).toBeAttached()
      await expect
        .poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width), {
          timeout: 30_000,
        })
        .toBeGreaterThan(300)
      await expect(page.locator('[data-mate-fallback]')).toHaveCount(0)
      // La portada vive en la primera parada: un solo título principal y sin la portada del servidor.
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.locator('.home-hero')).toHaveCount(0)
    })

    test('al bajar 1,6 paradas la bombilla es la actual, con su título y su fondo', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      await scrollToStops(page, 1.6)
      const rail = page.getByRole('navigation', RAIL)
      await expect(rail.getByRole('button').nth(1)).toHaveAttribute('aria-current', 'true')
      const panel = page.locator('[data-stage-stop="1"]')
      await expect(panel).toHaveAttribute('data-current', 'true')
      await expect(panel).toHaveCSS('opacity', '1')
      await expect(
        page.getByRole('heading', { level: 2, name: /Alpaca\s*y bronce\./ }),
      ).toBeInViewport()
      const backdrop = page.locator('[data-backdrop][data-current="true"]')
      await expect(backdrop).toHaveAttribute('data-backdrop', 'bombilla')
      expect(await horizontalOverflow(page)).toBe(0)
    })

    test('el fondo de cada parada se ve nítido y apenas oscurecido, sin desenfoque', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      await scrollToStops(page, 1.6)
      const photo = page.locator('[data-backdrop][data-current="true"] img')
      await expect(photo).toHaveCSS('filter', 'brightness(0.85) saturate(0.95)')
      await expect(photo).toHaveCSS('transform', 'none')
    })

    test('al bajar hasta el final el escenario se funde a negro y entra la colección', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const fade = page.locator('[data-stage-fade]')
      await scrollToStops(page, 2.2)
      await expect(fade).toHaveCSS('opacity', '0')
      await scrollToStops(page, STOPS)
      await expect(fade).toHaveCSS('opacity', '1')
      await page.mouse.wheel(0, 900)
      await expect(
        page.getByRole('heading', { level: 2, name: 'Seis líneas para cada ronda' }),
      ).toBeInViewport()
    })

    test('con Tab se recorren las tres paradas y cada una viene a la vista', async ({ page }) => {
      await gotoStore(page, '/')
      await page
        .locator('[data-stage-stop="0"]')
        .getByRole('link', { name: /Armá tu kit/ })
        .focus()
      for (const next of ['1', '2']) {
        // Tab hasta el primer elemento de la parada siguiente.
        for (let presses = 0; presses < 12; presses += 1) {
          await page.keyboard.press('Tab')
          if ((await focusedStop(page)) === next) break
        }
        expect(await focusedStop(page)).toBe(next)
        await expect(page.locator(`[data-stage-stop="${next}"]`)).toHaveAttribute(
          'data-current',
          'true',
        )
        await expect(
          page.getByRole('navigation', RAIL).getByRole('button').nth(Number(next)),
        ).toHaveAttribute('aria-current', 'true')
        await expect(page.locator(':focus')).toBeInViewport()
      }
    })

    test('tocar la tercera parada del raíl la deja como actual', async ({ page }) => {
      await gotoStore(page, '/')
      await scrollToStops(page, 0.2)
      const third = page.getByRole('navigation', RAIL).getByRole('button').nth(2)
      await third.click()
      await expect(third).toHaveAttribute('aria-current', 'true')
      await expect(page.getByRole('heading', { level: 2, name: /Agua a 75/ })).toBeInViewport()
    })

    test('el documento no tiene scroll horizontal y la portada se lee sobre su fondo', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      expect(await horizontalOverflow(page)).toBe(0)
      // Que terminen de aparecer la píldora, la bajada y los botones antes de medir el contraste.
      await page.waitForTimeout(1600)
      expect(await seriousViolations(page, '[data-stage-stop="0"]')).toEqual([])
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
        // La portada (píldora, título, bajada y botones) y la bombilla (dos productos) son las más altas.
        for (const index of [0, 1]) {
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

    test('portada con la foto del mate y las dos escenas apiladas, sin lienzo ni raíl', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      await expect(page.locator('[data-hero-poster] img[src*="pieces.jpg"]')).toBeVisible()
      await expect(page.locator('.home-scene')).toHaveCount(STACKED_SCENES)
      await expect(page.getByRole('region', STAGE)).toHaveCount(0)
      await expect(page.getByRole('navigation', RAIL)).toHaveCount(0)
      await expect(page.locator('canvas')).toHaveCount(0)
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

test.describe('tienda: el inicio en el celular (390 × 844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('portada y dos escenas apiladas, sin raíl, sin lienzo y sin scroll horizontal', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    await expect(page.locator('[data-hero-poster] img[src*="pieces.jpg"]')).toBeVisible()
    await expect(page.locator('.home-scene')).toHaveCount(STACKED_SCENES)
    await expect(page.getByRole('navigation', RAIL)).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)
    expect(await horizontalOverflow(page)).toBe(0)
  })
})
