import type { Locator, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/**
 * La misma grilla de tarjetas en los tres lugares (Ruling AT-2, Review Focus 2): la tienda con 5
 * por hilera en el contenedor angosto (`shop-container`), los relacionados de la ficha con 3
 * hileras y "Ver más productos", y los destacados del inicio con 3 apilados en el celular.
 */

/** Ancho de una tarjeta a 1905 px: (1424 − 4 × 20) / 5. */
const SHOP_CARD_WIDTH = 268.8

/** Texto del botón que despliega el resto en las tres grillas. */
const MORE = { name: 'Ver más productos' } as const

/** Lo que se mide de una grilla de tarjetas. */
interface GridBox {
  /** Ancho de cada columna, en píxeles. */
  columns: number[]
  /** Borde izquierdo de la grilla en la ventana. */
  left: number
  /** Borde derecho de la grilla en la ventana. */
  right: number
}

/** La sección del `h2` con ese título. */
function sectionOf(page: Page, title: string): Locator {
  return page
    .getByRole('heading', { level: 2, name: title, exact: true })
    .locator('xpath=ancestor::section[1]')
}

/** Las tarjetas dentro de un lugar de la página. */
function cardsIn(scope: Locator): Locator {
  return scope.locator('[data-product-card]')
}

/** Columnas y bordes de la grilla de arriba (la de la primera tarjeta). */
async function gridBox(cards: Locator): Promise<GridBox> {
  return await cards.first().evaluate((card) => {
    const grid = card.closest('[class*="grid-cols-"]')
    if (grid === null) return { columns: [], left: Number.NaN, right: Number.NaN }
    const box = grid.getBoundingClientRect()
    const columns = getComputedStyle(grid)
      .gridTemplateColumns.split(' ')
      .filter(Boolean)
      .map((track) => Number.parseFloat(track))
    return { columns, left: box.left, right: box.right }
  })
}

test.describe('grillas: la tienda a 1905 × 950', () => {
  test.skip(({ isMobile }) => isMobile, 'Los anchos se fijan en el proyecto de escritorio.')
  test.use({ viewport: { width: 1905, height: 950 } })

  test('5 columnas de 268,8 px, 20 tarjetas y "Ver más productos", con la barra alineada a la grilla', async ({
    page,
  }) => {
    await gotoStore(page, '/tienda')
    const main = page.locator('main')
    const cards = cardsIn(main)
    await expect(cards).toHaveCount(20)
    await expect(main.getByRole('button', MORE)).toBeVisible()
    const grid = await gridBox(cards)
    expect(grid.columns).toHaveLength(5)
    for (const width of grid.columns)
      expect(Math.abs(width - SHOP_CARD_WIDTH)).toBeLessThanOrEqual(1)
    // Las líneas arrancan donde arranca la grilla y el buscador termina donde termina.
    const lines = await page
      .getByRole('navigation', { name: 'Líneas de producto' })
      .evaluate((nav) => nav.getBoundingClientRect().left)
    const search = await main
      .locator('[role="search"]')
      .evaluate((box) => box.getBoundingClientRect().right)
    expect(Math.abs(lines - grid.left)).toBeLessThanOrEqual(1)
    expect(Math.abs(search - grid.right)).toBeLessThanOrEqual(1)
  })
})

test.describe('grillas: la tienda a 1440 × 900', () => {
  test.skip(({ isMobile }) => isMobile, 'Los anchos se fijan en el proyecto de escritorio.')
  test.use({ viewport: { width: 1440, height: 900 } })

  test('sigue igual que antes del contenedor angosto: 4 columnas y 16 tarjetas', async ({
    page,
  }) => {
    await gotoStore(page, '/tienda')
    const cards = cardsIn(page.locator('main'))
    await expect(cards).toHaveCount(16)
    expect((await gridBox(cards)).columns).toHaveLength(4)
  })
})

test.describe('grillas: los relacionados de la ficha a 1905 × 950', () => {
  test.skip(({ isMobile }) => isMobile, 'Los anchos se fijan en el proyecto de escritorio.')
  test.use({ viewport: { width: 1905, height: 950 } })

  test('3 hileras de 5 (15) y "Ver más productos"; al tocarlo, los 26', async ({ page }) => {
    await gotoStore(page, '/producto/mate-imperial-premium')
    const related = sectionOf(page, 'Más para la ronda')
    const cards = cardsIn(related)
    await expect(cards).toHaveCount(15)
    const grid = await gridBox(cards)
    expect(grid.columns).toHaveLength(5)
    // El título va alineado con la grilla angosta.
    const title = await related
      .getByRole('heading', { level: 2 })
      .evaluate((heading) => heading.getBoundingClientRect().left)
    expect(Math.abs(title - grid.left)).toBeLessThanOrEqual(1)
    const more = related.getByRole('button', MORE)
    await more.click()
    await expect(cards).toHaveCount(26)
    await expect(more).toHaveCount(0)
    await expect(cards.nth(15).getByRole('link')).toBeFocused()
  })
})

test.describe('grillas: los relacionados de la ficha a 390 × 844', () => {
  test.skip(({ isMobile }) => isMobile, 'Los anchos se fijan en el proyecto de escritorio.')
  test.use({ viewport: { width: 390, height: 844 } })

  test('una columna: 3 tarjetas y "Ver más productos"', async ({ page }) => {
    await gotoStore(page, '/producto/mate-imperial-premium')
    const related = sectionOf(page, 'Más para la ronda')
    await expect(cardsIn(related)).toHaveCount(3)
    await expect(related.getByRole('button', MORE)).toBeVisible()
  })
})

test.describe('grillas: los más vendidos del inicio a 390 × 844', () => {
  test.skip(({ isMobile }) => isMobile, 'Los anchos se fijan en el proyecto de escritorio.')
  test.use({ viewport: { width: 390, height: 844 } })

  test('3 destacados apilados y "Ver más productos"; al tocarlo, los 8', async ({ page }) => {
    await gotoStore(page, '/')
    const featured = sectionOf(page, 'Los más vendidos')
    await featured.scrollIntoViewIfNeeded()
    const cards = cardsIn(featured)
    await expect(cards).toHaveCount(3)
    expect((await gridBox(cards)).columns).toHaveLength(1)
    const more = featured.getByRole('button', MORE)
    await more.click()
    await expect(cards).toHaveCount(8)
    await expect(more).toHaveCount(0)
    await expect(cards.nth(3).getByRole('link')).toBeFocused()
  })
})

test.describe('grillas: los más vendidos del inicio a 768 × 1024', () => {
  test.skip(({ isMobile }) => isMobile, 'Los anchos se fijan en el proyecto de escritorio.')
  test.use({ viewport: { width: 768, height: 1024 } })

  test('dos columnas: los 8 destacados y sin botón', async ({ page }) => {
    await gotoStore(page, '/')
    const featured = sectionOf(page, 'Los más vendidos')
    await featured.scrollIntoViewIfNeeded()
    const cards = cardsIn(featured)
    // La grilla ya se midió (2 columnas): con una sola se plegaría a 3.
    await expect.poll(async () => (await gridBox(cards)).columns.length).toBe(2)
    await expect(cards).toHaveCount(8)
    await expect(featured.getByRole('button', MORE)).toHaveCount(0)
  })
})
