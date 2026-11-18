import type { Locator, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Nombre accesible de la sección del mate 3D. */
const STAGE = { name: 'El mate', exact: true } as const

/** Cuántas paradas tiene el mate 3D. */
const STOPS = 3

/** La portada del v4, donde no hay mate 3D (Ruling IC-8). */
const HERO_CAROUSEL = '[data-hero-carousel]'

/** La fila centrada más cercana de un botón (la de los botones o la del botón de la escena). */
const CENTERED_ROW = 'xpath=ancestor::*[contains(@class, "justify-center")][1]'

/** Lo que se mide de un título: sus renglones y si entran en su columna. */
interface TitleFit {
  /** El texto de cada renglón. */
  rows: string[]
  /** Si algún renglón ocupa más de una línea (se cortó). */
  wrapped: boolean
  /** Cuánto se pasa el renglón más ancho del ancho de la columna, en píxeles (≤ 0 si entra). */
  overflow: number
}

/** Mide los renglones (`[data-title-line]`) de un título contra el ancho de su columna. */
async function titleFit(heading: Locator): Promise<TitleFit> {
  return await heading.evaluate((element) => {
    const size = Number.parseFloat(getComputedStyle(element).fontSize)
    const column = element.getBoundingClientRect().width
    const rows = [...element.querySelectorAll('[data-title-line]')]
    const widths = rows.map((row) => {
      const range = document.createRange()
      range.selectNodeContents(row)
      return range.getBoundingClientRect().width
    })
    return {
      rows: rows.map((row) => row.textContent),
      // Un renglón de una línea mide lo que su `line-height` (0,9 a 0,92 em): con dos, el doble.
      wrapped: rows.some((row) => row.getBoundingClientRect().height > size * 1.4),
      overflow: Math.max(...widths) - column,
    }
  })
}

/** Cuánto se corre el centro de lo que hay adentro de `container` respecto del suyo, en píxeles. */
async function offCenter(container: Locator, items: string): Promise<number> {
  return await container.evaluate((element, selector) => {
    const box = element.getBoundingClientRect()
    const parts = [...element.querySelectorAll(selector)].map((part) =>
      part.getBoundingClientRect(),
    )
    const left = Math.min(...parts.map((part) => part.left))
    const right = Math.max(...parts.map((part) => part.right))
    return Math.abs((left + right) / 2 - (box.left + box.right) / 2)
  }, items)
}

/** Ancho del documento que sobra a los costados (0 si no hay scroll horizontal). */
async function horizontalOverflow(page: Page): Promise<number> {
  return await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

/** Lleva la página a la parada `index` del mate 3D y espera a que su panel termine de entrar. */
async function showStop(page: Page, index: number): Promise<Locator> {
  await page.getByRole('region', STAGE).evaluate(
    (section, [value, count]) => {
      const box = section.getBoundingClientRect()
      const span = (box.height - window.innerHeight) / count
      window.scrollTo(0, box.top + window.scrollY + value * span)
    },
    [index + 0.2, STOPS] as const,
  )
  const panel = page.locator(`[data-stage-stop="${String(index)}"]`)
  await expect(panel).toHaveAttribute('data-current', 'true')
  await expect(panel.locator('.home-stop-column > *').last()).toHaveCSS('opacity', '1')
  return panel
}

test.describe('tienda: títulos del inicio en un renglón (Ruling AI-4)', () => {
  test.skip(({ isMobile }) => isMobile, 'Los tamaños de ventana van fijos en cada caso.')

  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1905, height: 950 },
  ]) {
    test.describe(`mate 3D a ${String(viewport.width)} × ${String(viewport.height)}`, () => {
      test.use({ viewport, reducedMotion: 'no-preference' })

      test('los títulos entran sin cortarse y solo los botones y los pasos van centrados', async ({
        page,
      }) => {
        await gotoStore(page, '/')
        await expect(page.getByRole('region', STAGE)).toBeAttached()
        expect(await horizontalOverflow(page)).toBe(0)

        const hero = await showStop(page, 0)
        const title = await titleFit(hero.getByRole('heading', { level: 1 }))
        expect(title.rows).toEqual(['Encontrá tu mate.'])
        expect(title.wrapped).toBe(false)
        expect(title.overflow).toBeLessThanOrEqual(0)
        const heroButtons = hero.getByRole('link', { name: 'Ver la tienda' }).locator(CENTERED_ROW)
        expect(await offCenter(heroButtons, 'a')).toBeLessThanOrEqual(2)
        // La bajada sigue a la izquierda, alineada con el título.
        const lede = await hero.locator('p').first().boundingBox()
        const heading = await hero.getByRole('heading', { level: 1 }).boundingBox()
        expect(Math.abs((lede?.x ?? -1) - (heading?.x ?? -2))).toBeLessThanOrEqual(1)

        const bombilla = await showStop(page, 1)
        const bombillaTitle = await titleFit(bombilla.getByRole('heading', { level: 2 }))
        expect(bombillaTitle.rows).toEqual(['Alpaca y bronce.'])
        expect(bombillaTitle.wrapped).toBe(false)
        expect(bombillaTitle.overflow).toBeLessThanOrEqual(0)
        const cta = bombilla.getByRole('link', { name: 'Ver bombillones' }).locator(CENTERED_ROW)
        expect(await offCenter(cta, 'a')).toBeLessThanOrEqual(2)

        const ritual = await showStop(page, 2)
        const ritualTitle = await titleFit(ritual.getByRole('heading', { level: 2 }))
        expect(ritualTitle.rows).toEqual(['Agua a 75 °C.', 'Nunca hervida.'])
        expect(ritualTitle.wrapped).toBe(false)
        expect(ritualTitle.overflow).toBeLessThanOrEqual(0)
        expect(await offCenter(ritual.getByRole('list'), 'li')).toBeLessThanOrEqual(2)
        expect(await horizontalOverflow(page)).toBe(0)
      })
    })
  }

  for (const viewport of [
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1905, height: 950 },
  ]) {
    test.describe(`portada sin 3D a ${String(viewport.width)} × ${String(viewport.height)}`, () => {
      test.use({ viewport, reducedMotion: 'reduce' })

      test('"Encontrá tu mate." entra en un renglón y los dos botones van centrados', async ({
        page,
      }) => {
        await gotoStore(page, '/')
        const carousel = page.locator(HERO_CAROUSEL)
        await expect(carousel).toBeVisible()
        const title = await titleFit(carousel.getByRole('heading', { level: 1 }))
        expect(title.rows).toEqual(['Encontrá tu mate.'])
        expect(title.wrapped).toBe(false)
        expect(title.overflow).toBeLessThanOrEqual(0)
        const buttons = carousel.getByRole('link', { name: 'Ver la tienda' }).locator(CENTERED_ROW)
        expect(await offCenter(buttons, 'a')).toBeLessThanOrEqual(2)
        expect(await horizontalOverflow(page)).toBe(0)
      })
    })
  }
})
