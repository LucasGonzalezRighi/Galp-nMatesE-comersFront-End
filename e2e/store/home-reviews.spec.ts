import type { Locator, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Cuántas reseñas destacadas muestra el inicio: dos por cada parte del mate. */
const REVIEWS = 10

/**
 * Qué parte del alto de la palabra GALPÓN queda a la vista al final de la página: hasta la mitad
 * de sus letras (Ruling MR-21; el logo mide 1447 × 279 y las letras van de 72 a 266).
 */
const WORD_VISIBLE_SHARE = 169 / 279

/** Las reseñas clavadas (`FooterStage`): el escenario con su recorrido extra. */
function reviewsStage(page: Page): Locator {
  return page.locator('[data-footer-stage]')
}

/** La sección de las reseñas del inicio (la que el pie tapa al subir). */
function reviewsSection(page: Page): Locator {
  return page.locator('section:has([data-reviews-collage])')
}

/** El pie de página. */
function footer(page: Page): Locator {
  return page.locator('footer.site-footer')
}

/** El rectángulo de un elemento en la ventana. */
async function rectOf(locator: Locator): Promise<{ top: number; bottom: number; height: number }> {
  return await locator.evaluate((element) => {
    const { top, bottom, height } = element.getBoundingClientRect()
    return { top, bottom, height }
  })
}

/**
 * El borde de arriba de un bloque clavado en la ventana, sin su escala (que achica el rectángulo
 * desde su origen mientras el pie lo tapa): el de su escenario más su lugar dentro de él.
 */
async function layoutTopOf(locator: Locator): Promise<number> {
  return await locator.evaluate((element) => {
    const parent = (element as HTMLElement).offsetParent ?? element.parentElement
    return (parent?.getBoundingClientRect().top ?? 0) + (element as HTMLElement).offsetTop
  })
}

/** Lleva la página a `y` píxeles del principio, sin desplazamiento suave, y espera un cuadro. */
async function scrollPageTo(page: Page, y: number): Promise<void> {
  await page.evaluate(async (top) => {
    window.scrollTo({ top, behavior: 'instant' })
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }, y)
}

/** Lleva la página al final y espera a que llegue (el alto puede cambiar mientras hidrata). */
async function scrollToEnd(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      await scrollPageTo(page, await page.evaluate(() => document.documentElement.scrollHeight))
      return await page.evaluate(
        () =>
          document.documentElement.scrollHeight - window.innerHeight - Math.ceil(window.scrollY),
      )
    })
    .toBeLessThanOrEqual(1)
}

/** Dónde empieza un elemento en el documento. */
async function documentTopOf(page: Page, locator: Locator): Promise<number> {
  await scrollPageTo(page, 0)
  return await locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
}

/**
 * Al final de la página: el pie termina en el borde de abajo de la ventana y la palabra queda
 * cortada ahí, a la mitad de sus letras (Rulings MR-21 y MR-23).
 */
async function expectPageEndsAtHalfWord(page: Page): Promise<void> {
  await scrollToEnd(page)
  const viewportHeight = await page.evaluate(() => window.innerHeight)
  const pageFooter = footer(page)
  const frame = await rectOf(pageFooter.locator('[data-wordmark]'))
  const word = await rectOf(pageFooter.locator('[data-wordmark-word]'))
  expect(Math.abs((await rectOf(pageFooter)).bottom - viewportHeight)).toBeLessThan(2)
  expect(Math.abs(frame.bottom - viewportHeight)).toBeLessThan(2)
  expect(frame.height / word.height).toBeCloseTo(WORD_VISIBLE_SHARE, 1)
  // La palabra sigue debajo del borde: lo que se ve es su parte de arriba.
  expect(word.bottom).toBeGreaterThan(viewportHeight + word.height * 0.3)
}

test.describe('tienda: las reseñas del inicio y el pie que sube', () => {
  test.describe('en escritorio (1440 × 900)', () => {
    test.skip(
      ({ isMobile }) => isMobile,
      'El pie que sube es de escritorio; el celular tiene su prueba.',
    )
    test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

    test('las reseñas se pegan sobre el mate: se arma el collage, cada nota tiene su hilo y el mouse ilumina su parte', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const section = reviewsSection(page)
      await section.scrollIntoViewIfNeeded()
      const collage = section.locator('[data-reviews-collage]')
      const notes = collage.getByRole('list', { name: 'Reseñas de clientes' }).getByRole('listitem')

      // Diez notas, cinco a cada lado del mate, y un hilo por nota cuando terminó de armarse.
      await expect(notes).toHaveCount(REVIEWS)
      await expect(collage).toHaveAttribute('data-assembled', 'true')
      await expect(collage.locator('li[data-side="left"]')).toHaveCount(REVIEWS / 2)
      await expect(collage.locator('svg line')).toHaveCount(REVIEWS)

      // Las notas quedan dentro de la ventana, a los costados de la foto.
      const photo = await collage.locator('[aria-hidden="true"]:has([data-cell])').boundingBox()
      for (const box of await notes.evaluateAll((items) =>
        items.map((item) => item.getBoundingClientRect().toJSON() as DOMRect),
      )) {
        expect(box.left).toBeGreaterThanOrEqual(0)
        expect(box.right).toBeLessThanOrEqual(1440)
        expect(
          box.right <= (photo?.x ?? 0) + 24 ||
            box.left >= (photo?.x ?? 0) + (photo?.width ?? 0) - 24,
        ).toBe(true)
      }

      await collage.locator('li[data-note="pie"]').first().hover()
      await expect(collage).toHaveAttribute('data-active-part', 'pie')
    })

    test('al bajar el pie sube por encima de las reseñas quietas y borrosas, y la página termina en GALPÓN cortada', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const stage = reviewsStage(page)
      const pinned = stage.locator(':scope > div')
      const pageFooter = footer(page)
      await expect(page.locator('html')).toHaveAttribute('data-footer-rise', '')
      const start = await documentTopOf(page, stage)
      const footerHeight = (await rectOf(pageFooter)).height

      // Dos posiciones dentro del tramo: las reseñas clavadas arriba y el pie subiendo.
      await scrollPageTo(page, start + footerHeight * 0.25)
      const pinnedTopBefore = await layoutTopOf(pinned)
      const footerTopBefore = (await rectOf(pageFooter)).top
      await scrollPageTo(page, start + footerHeight * 0.75)
      const pinnedTopAfter = await layoutTopOf(pinned)
      const footerTopAfter = (await rectOf(pageFooter)).top

      expect(Math.abs(pinnedTopAfter - pinnedTopBefore)).toBeLessThan(1)
      expect(Math.abs(pinnedTopAfter)).toBeLessThan(1)
      expect(footerTopAfter).toBeLessThan(footerTopBefore - footerHeight * 0.4)
      expect(footerTopAfter).toBeLessThan((await rectOf(pinned)).bottom)
      await expect(pageFooter).toHaveCSS('z-index', '20')
      // Mientras el pie las tapa, las reseñas se desenfocan y oscurecen.
      await expect
        .poll(() => pinned.evaluate((element) => getComputedStyle(element).filter))
        .toMatch(/blur\([1-4](?:\.\d+)?px\) brightness\(0\.[5-9]/)

      // Al final las filas nítidas y la ola entera, quieta en su lugar.
      await expectPageEndsAtHalfWord(page)
      const rows = pageFooter.locator('[data-footer-row]')
      await expect
        .poll(async () =>
          Math.min(
            ...(await rows.evaluateAll((items) =>
              items.map((item) => Number(getComputedStyle(item).opacity)),
            )),
          ),
        )
        .toBe(1)
      for (const filter of await rows.evaluateAll((items) =>
        items.map((item) => getComputedStyle(item).filter),
      )) {
        expect(filter).toBe('none')
      }
      const lit = pageFooter.locator('[data-wordmark-layer="lit"]')
      await expect
        .poll(() => lit.last().evaluate((element) => element.style.clipPath))
        .toMatch(/^inset\(0(?:\.\d+)?(?:%|px)?[\s)]/)
    })

    test('Destacados se despide y el Manifiesto se enciende al entrar, a simple vista', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const grid = page.locator('main [class*="auto-fill"]').first()
      const manifesto = page.locator('section.home-manifesto')
      // El fondo (con la capa que se enciende) cubre el Manifiesto y las cifras, en el bloque clavado.
      const block = page.locator('[data-manifesto-block]')
      const shade = block.locator('[data-manifesto-shade]')
      const text = manifesto.locator('.z-10').first()
      const opacityOf = (locator: Locator) => async (): Promise<number> =>
        await locator.evaluate((element) => Number(getComputedStyle(element).opacity))

      // Con el pie de la grilla a media ventana, Destacados va por la mitad de su salida.
      const gridBottom = await grid.evaluate(
        (element) => element.getBoundingClientRect().bottom + window.scrollY,
      )
      await scrollPageTo(page, gridBottom - 450)
      await expect.poll(opacityOf(grid)).toBeLessThan(0.7)
      expect(await opacityOf(grid)()).toBeGreaterThan(0.3)

      // El Manifiesto asomando (su borde de arriba a 600 px): la capa oscura todavía lo tapa en parte
      // y el texto apenas empieza a aparecer; ya arriba (clavado), la foto encendida y el texto
      // entero. El texto termina de entrar con su borde a ~85 px de arriba: desde 3d18c7a la fila de
      // la frase y el link es un renglón más baja a 1440 y el texto, centrado, queda más abajo.
      const manifestoTop = await documentTopOf(page, block)
      await scrollPageTo(page, manifestoTop - 600)
      await expect.poll(opacityOf(shade)).toBeLessThan(0.75)
      expect(await opacityOf(shade)()).toBeGreaterThan(0.1)
      expect(await opacityOf(text)()).toBeLessThan(0.3)
      await scrollPageTo(page, manifestoTop)
      await expect.poll(opacityOf(shade)).toBe(0)
      await expect.poll(opacityOf(text)).toBe(1)
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

      test('el pie no se superpone a las reseñas, que no se clavan, y la página termina en GALPÓN cortada', async ({
        page,
      }) => {
        await gotoStore(page, '/')
        const section = reviewsSection(page)
        const pageFooter = footer(page)

        await expect(reviewsStage(page)).toHaveCount(0)
        await expect(page.locator('html')).not.toHaveAttribute('data-footer-rise')
        await expect(pageFooter).toHaveCSS('margin-top', '0px')
        await expectPageEndsAtHalfWord(page)
        expect((await rectOf(pageFooter)).top).toBeGreaterThanOrEqual(
          (await rectOf(section)).bottom - 1,
        )
        await expect(pageFooter.locator('[data-wordmark-layer="lit"]').first()).toBeInViewport()
      })
    })
  }
})
