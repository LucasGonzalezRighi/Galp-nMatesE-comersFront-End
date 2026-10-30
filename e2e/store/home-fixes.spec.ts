import type { Locator, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Nombre accesible de la sección del mate 3D. */
const STAGE = { name: 'El mate', exact: true } as const

/** Lleva la página a `y` píxeles del principio, sin desplazamiento suave, y espera un cuadro. */
async function scrollPageTo(page: Page, y: number): Promise<void> {
  await page.evaluate(async (top) => {
    window.scrollTo({ top, behavior: 'instant' })
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }, y)
}

/** Baja de a `step` píxeles, como con la rueda, `times` veces. */
async function wheelDown(page: Page, step: number, times: number): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await page.mouse.wheel(0, step)
    await page.waitForTimeout(120)
  }
}

/** El borde de arriba del encabezado en la ventana (−64 cuando está escondido). */
async function headerTop(page: Page): Promise<number> {
  return await page
    .locator('header')
    .first()
    .evaluate((element) => element.getBoundingClientRect().top)
}

/** Dónde empieza un elemento en el documento. */
async function documentTopOf(locator: Locator): Promise<number> {
  return await locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
}

test.describe('tienda: las correcciones de Lucas en el inicio (1905 × 950)', () => {
  test.skip(({ isMobile }) => isMobile, 'Son de escritorio: el celular apila el inicio.')
  test.use({ viewport: { width: 1905, height: 950 }, reducedMotion: 'no-preference' })

  test('el encabezado se esconde al bajar sobre el mate 3D y desde la colección queda fijo (Ruling MR-20)', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const stage = page.getByRole('region', STAGE)
    const stageTop = await documentTopOf(stage)
    await scrollPageTo(page, stageTop + 1200)
    await page.mouse.move(950, 500)
    await wheelDown(page, 200, 4)
    await expect.poll(() => headerTop(page)).toBeLessThan(-40)

    // Pasado el escenario (la colección en adelante), bajando y subiendo, siempre a la vista.
    const stageBottom = await stage.evaluate(
      (element) => element.getBoundingClientRect().bottom + window.scrollY,
    )
    await scrollPageTo(page, stageBottom + 200)
    await wheelDown(page, 200, 5)
    await expect.poll(() => headerTop(page)).toBe(0)
    await page.mouse.wheel(0, -300)
    await page.waitForTimeout(400)
    expect(await headerTop(page)).toBe(0)
  })

  test('el logo del encabezado vuelve arriba de todo desde el pie, con el mate vacío (Ruling MR-17)', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    await scrollPageTo(page, await page.evaluate(() => document.documentElement.scrollHeight))
    await expect(page.locator('footer.site-footer')).toBeInViewport()
    await expect.poll(() => headerTop(page)).toBe(0)

    await page.getByRole('link', { name: 'Galpón — inicio' }).click()
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBe(0)
    await expect(
      page.getByRole('heading', { level: 1, name: /Encontrá\s*tu mate\./ }),
    ).toBeInViewport()
    // La primera parada (la portada), el mate vacío.
    await expect(page.locator('[data-backdrop][data-current="true"]')).toHaveAttribute(
      'data-backdrop',
      'hero',
    )
  })

  test('la frase del Manifiesto va en cuatro renglones, con el link a la derecha del último (Ruling MR-23)', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const manifesto = page.locator('section.home-manifesto')
    await manifesto.scrollIntoViewIfNeeded()
    const phrase = manifesto.locator('.home-manifesto-phrase')
    const lines = await phrase.evaluate((element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const tops = [...range.getClientRects()].map((rect) => Math.round(rect.top))
      return new Set(tops).size
    })
    expect(lines).toBe(4)

    const link = manifesto.getByRole('link', { name: /Conocé la historia del galpón/ })
    const container = await phrase.evaluate((element) => {
      const box = element.parentElement?.getBoundingClientRect()
      return { right: box?.right ?? 0 }
    })
    const linkBox = await link.boundingBox()
    const phraseBox = await phrase.boundingBox()
    if (linkBox === null || phraseBox === null) throw new Error('Falta la frase o el link.')
    expect(Math.abs(linkBox.x + linkBox.width - container.right)).toBeLessThan(2)
    // A la altura del último renglón: el borde de abajo del link cerca del de la frase.
    expect(Math.abs(linkBox.y + linkBox.height - (phraseBox.y + phraseBox.height))).toBeLessThan(40)
  })

  test('las cifras cuentan de 0 juntas cuando la banda se ve entera, centradas sobre su rótulo (Rulings MR-25 y MR-26)', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const band = page.locator('[data-stats-band]')
    // Lo que se ve de cada cifra (el conteo) y el número final reservado (invisible) en su celda.
    const numbers = band.locator('p:first-child > span:not([aria-hidden]) > span[aria-hidden]')
    await expect(numbers).toHaveCount(4)
    const block = page.locator('[data-manifesto-block]')
    const trackTop = await block.evaluate(
      (element) => (element.parentElement?.getBoundingClientRect().top ?? 0) + window.scrollY,
    )
    // Antes de llegar: la banda todavía no está entera a la vista y los números no arrancaron.
    await scrollPageTo(page, trackTop - 700)
    await page.waitForTimeout(300)
    expect(await numbers.allTextContents()).toEqual(['0', '0', '0', '0'])

    // Clavado, con la banda entera: apenas arranca, los números van por el medio, y al final
    // quedan en su número.
    const finals = await band
      .locator('p:first-child > span[aria-hidden]')
      .allTextContents()
      .then((values) => values.map(Number))
    await scrollPageTo(page, trackTop + 40)
    const shown = async (): Promise<number[]> => (await numbers.allTextContents()).map(Number)
    await expect
      .poll(async () => (await shown()).some((value) => value > 0), { intervals: [40] })
      .toBe(true)
    const midway = await shown()
    expect(midway.some((value, index) => value < (finals[index] ?? 0))).toBe(true)
    await expect.poll(async () => (await numbers.allTextContents()).map(Number)).toEqual(finals)

    // Cada número centrado sobre su rótulo.
    const offsets = await band.locator(':scope > *').evaluateAll((columns) =>
      columns.map((column) => {
        const [number, label] = [...column.querySelectorAll('p')].map((p) => {
          const box = p.getBoundingClientRect()
          return box.left + box.width / 2
        })
        return Math.abs((number ?? 0) - (label ?? 0))
      }),
    )
    for (const offset of offsets) expect(offset).toBeLessThan(2)
  })

  test('en la tarjeta de producto, el hover de la tarjeta no pinta la píldora ni el "+" (Ruling MR-24)', async ({
    page,
  }) => {
    await gotoStore(page, '/tienda')
    const card = page.locator('[class*="group/card"]').first()
    const pillSweep = card.locator('[aria-hidden="true"] [data-button-sweep]').first()
    const add = card.getByRole('button', { name: 'Agregar al carrito' })
    const addSweep = add.locator('[data-button-sweep]')
    const clipOf = (locator: Locator) => async (): Promise<string> =>
      await locator.evaluate((element) => getComputedStyle(element).clipPath)

    await card.hover({ position: { x: 20, y: 20 } })
    await page.waitForTimeout(700)
    expect(await clipOf(pillSweep)()).toMatch(/inset\(0(?:px)? 100%/)
    expect(await clipOf(addSweep)()).toMatch(/inset\(0(?:px)? 100%/)

    await add.hover()
    await expect.poll(clipOf(addSweep), { timeout: 4000 }).toMatch(/^inset\(0(?:px)?\)$/)
    expect(await clipOf(pillSweep)()).toMatch(/inset\(0(?:px)? 100%/)
  })
})

test.describe('tienda: las columnas del pie, más al centro (Ruling MR-23)', () => {
  test.skip(({ isMobile }) => isMobile, 'En el celular las columnas van apiladas.')

  for (const viewport of [
    { width: 1905, height: 950 },
    { width: 1440, height: 900 },
  ]) {
    test.describe(`a ${String(viewport.width)} × ${String(viewport.height)}`, () => {
      test.use({ viewport, reducedMotion: 'reduce' })

      test('las columnas arrancan cerca del 40 % del contenedor, a 96 px o más de la frase', async ({
        page,
      }) => {
        await gotoStore(page, '/tienda')
        const footer = page.locator('footer.site-footer')
        await footer.scrollIntoViewIfNeeded()
        const container = await footer
          .locator('.site-container')
          .first()
          .evaluate((element) => {
            const box = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            const left = box.left + Number.parseFloat(style.paddingLeft)
            const right = box.right - Number.parseFloat(style.paddingRight)
            return { left, width: right - left }
          })
        const shop = await footer
          .getByRole('navigation', { name: 'Tienda' })
          .evaluate((element) => element.getBoundingClientRect().left)
        const tagline = await footer
          .locator('[data-footer-row="0"]')
          .evaluate((element) => element.getBoundingClientRect().right)
        const share = (shop - container.left) / container.width
        expect(share).toBeGreaterThanOrEqual(0.38)
        expect(share).toBeLessThanOrEqual(0.42)
        expect(shop - tagline).toBeGreaterThanOrEqual(96)
      })
    })
  }
})
