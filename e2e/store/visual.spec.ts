import type { Browser, BrowserContext, Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { gotoStore, STORE_SCREENS } from '../support/store'
import { expect, test } from '../support/test'

/** Carpeta donde se guardan las capturas (se compara a ojo con `docs/design/galpon-tienda-v3/screens/`). */
const OUTPUT_DIR = join('test-results', 'visual')

/** Tamaños de ventana del control visual: los mismos que usó el diseño (`scripts/capture-design.mjs`). */
const VIEWPORTS = [
  { label: '1440', width: 1440, height: 900 },
  { label: '390', width: 390, height: 844 },
] as const

/** Una pantalla que solo se captura (no se recorre en las demás pruebas) porque el diseño la tiene. */
const EXTRA_SCREENS = [
  { name: 'product-galleta', path: '/producto/mate-galleta', heading: 'Mate Galleta' },
  { name: 'shop-search', path: '/tienda?q=mate', heading: 'Todo el catálogo' },
] as const

/** Cuánto baja cada paso al recorrer la página para disparar las apariciones, en píxeles. */
const SCROLL_STEP = 450

// Las capturas se sacan una sola vez, en el proyecto de escritorio, con su propia ventana de 1440 y
// de 390 px; el proyecto del celular repetiría lo mismo.
test.skip(({ isMobile }) => isMobile, 'Las capturas del control visual se sacan una sola vez.')

/** Abre una ventana limpia del tamaño pedido, como la del diseño: sin zoom, en español y hora de Buenos Aires. */
async function openContext(
  browser: Browser,
  baseURL: string | undefined,
  viewport: { width: number; height: number },
): Promise<BrowserContext> {
  return await browser.newContext({
    baseURL,
    viewport,
    deviceScaleFactor: 1,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    reducedMotion: 'no-preference',
  })
}

/**
 * Recorre la página con scroll para disparar las apariciones, espera a que terminen (incluidos los
 * contadores numéricos, que cuentan durante unos 2 s) y vuelve al inicio.
 */
async function revealAll(page: Page): Promise<void> {
  const pageHeight = (): Promise<number> =>
    page.evaluate(() => document.documentElement.scrollHeight)
  for (let top = 0; top < (await pageHeight()); top += SCROLL_STEP) {
    await page.evaluate((y) => {
      window.scrollTo(0, y)
    }, top)
    await page.waitForTimeout(90)
  }
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await page.waitForTimeout(2200)
  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(700)
}

/**
 * Guarda la captura de la página completa. La cortina de transición, el carrito y otros paneles
 * fijos esperan fuera de la ventana; en una captura completa quedarían dibujados sobre el
 * contenido, así que se ocultan (igual que en las capturas del diseño).
 */
async function saveFullPage(page: Page, name: string, label: string): Promise<void> {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>('body *')) {
      if (getComputedStyle(element).position !== 'fixed') continue
      const box = element.getBoundingClientRect()
      if (box.top >= window.innerHeight || box.left >= window.innerWidth) {
        element.style.visibility = 'hidden'
      }
    }
  })
  mkdirSync(OUTPUT_DIR, { recursive: true })
  await page.screenshot({ path: join(OUTPUT_DIR, `${name}-${label}.png`), fullPage: true })
}

/** Guarda la captura de lo que se ve en la ventana (para los paneles abiertos). */
async function saveViewport(page: Page, name: string, label: string): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  await page.screenshot({ path: join(OUTPUT_DIR, `${name}-${label}.png`) })
}

test.describe('tienda: control visual (capturas)', () => {
  for (const viewport of VIEWPORTS) {
    for (const screen of [...STORE_SCREENS, ...EXTRA_SCREENS]) {
      test(`captura ${screen.name} a ${viewport.label} px`, async ({ browser, baseURL }) => {
        const context = await openContext(browser, baseURL, viewport)
        const page = await context.newPage()
        await gotoStore(page, screen.path)
        await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await revealAll(page)
        await saveFullPage(page, screen.name, viewport.label)
        await context.close()
      })
    }

    test(`captura el carrito abierto con un producto y un kit a ${viewport.label} px`, async ({
      browser,
      baseURL,
    }) => {
      const context = await openContext(browser, baseURL, viewport)
      const page = await context.newPage()
      await gotoStore(page, '/producto/mate-imperial-premium')
      await page
        .getByRole('main')
        .getByRole('button', { name: 'Agregar al carrito' })
        .first()
        .click()
      await gotoStore(page, '/kit')
      await page.getByRole('button', { name: /^Imperiales Mate Imperial Premium/ }).click()
      await page
        .getByRole('button', { name: /^Bombillones / })
        .first()
        .click()
      await page
        .getByRole('button', { name: /^Yerbas / })
        .first()
        .click()
      await page.getByRole('button', { name: 'Agregar kit al carrito' }).click()
      await page.getByRole('button', { name: /^Abrir carrito/ }).click()
      await expect(page.getByRole('dialog', { name: /^Carrito/ })).toBeVisible()
      await page.waitForTimeout(900)
      await saveViewport(page, 'cart', viewport.label)
      await context.close()
    })

    test(`captura el buscador vacío y con resultados a ${viewport.label} px`, async ({
      browser,
      baseURL,
    }) => {
      const context = await openContext(browser, baseURL, viewport)
      const page = await context.newPage()
      await gotoStore(page, '/tienda')
      await page.getByRole('button', { name: 'Buscar', exact: true }).click()
      const field = page.getByRole('dialog', { name: 'Buscar' }).getByRole('searchbox')
      await expect(
        page.getByRole('dialog', { name: 'Buscar' }).getByRole('link', { name: 'Imperiales' }),
      ).toBeVisible()
      await page.waitForTimeout(900)
      await saveViewport(page, 'search', viewport.label)
      await field.fill('mate')
      await expect(
        page
          .getByRole('dialog', { name: 'Buscar' })
          .getByRole('link', { name: /Mate Imperial Premium/ }),
      ).toBeVisible()
      await page.waitForTimeout(900)
      await saveViewport(page, 'search-results', viewport.label)
      await context.close()
    })
  }

  test('captura el menú abierto del celular a 390 px', async ({ browser, baseURL }) => {
    const context = await openContext(browser, baseURL, { width: 390, height: 844 })
    const page = await context.newPage()
    await gotoStore(page, '/')
    await page.getByRole('button', { name: 'Menú', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible()
    await page.waitForTimeout(900)
    await saveViewport(page, 'menu', '390')
    await context.close()
  })
})
