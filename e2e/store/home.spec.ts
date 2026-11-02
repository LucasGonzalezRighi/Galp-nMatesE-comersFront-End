import type { Locator, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Nombre accesible de la sección del mate 3D y de su raíl. */
const STAGE = { name: 'El mate', exact: true } as const
const RAIL = { name: 'Paradas del mate' } as const

/** Cuántas paradas tiene el mate 3D. */
const STOPS = 3

/**
 * Dónde empieza la zambullida, en paradas: al terminar el hold de la parada 3 (el 55 % de su tramo),
 * como `DIVE_FROM` de `mate3d/keyframes.ts`.
 */
const DIVE_STOPS = 2.55

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

/**
 * Lleva la página a un avance de la entrada de la colección (0: asoma abajo, al soltarse el
 * escenario; 1: llegó al 15 % de arriba de la ventana). Se mide desde el final del escenario.
 */
async function scrollToEntry(page: Page, entry: number): Promise<void> {
  await page.getByRole('region', STAGE).evaluate((section, value) => {
    const bottom = section.getBoundingClientRect().bottom + window.scrollY
    window.scrollTo(0, bottom - window.innerHeight + value * 0.85 * window.innerHeight)
  }, entry)
}

/** La parada (desde 0) del elemento que tiene el foco, o `null` si no está en una. */
async function focusedStop(page: Page): Promise<string | null> {
  return await page.evaluate(
    () =>
      document.activeElement?.closest('[data-stage-stop]')?.getAttribute('data-stage-stop') ?? null,
  )
}

/**
 * Sube de a poco, como con la rueda, hasta que el Manifiesto queda clavado con la frase entera
 * (60 px adentro del recorrido); devuelve el `top` del recorrido en el documento.
 */
async function climbToManifesto(page: Page, viewportHeight: number): Promise<number> {
  const block = page.locator('[data-manifesto-block]')
  await expect(block).toHaveCSS('position', 'sticky')
  const trackTop = await block.evaluate(
    (element) => (element.parentElement?.getBoundingClientRect().top ?? 0) + window.scrollY,
  )
  for (const share of [0.8, 0.5, 0.2, 0]) {
    await page.evaluate(
      (top) => {
        window.scrollTo(0, top)
      },
      trackTop - viewportHeight * share,
    )
    await page.waitForTimeout(200)
  }
  await page.evaluate((top) => {
    window.scrollTo(0, top + 60)
  }, trackTop)
  return trackTop
}

/** Cuánto lo tapa el kit: desenfoque (px), brillo y escala del bloque clavado (sin tapar: 0, 1 y 1). */
async function coverOf(
  block: Locator,
): Promise<{ blur: number; brightness: number; scale: number }> {
  return await block.evaluate((element) => {
    const style = getComputedStyle(element)
    const blur = /blur\(([\d.]+)px\)/.exec(style.filter)
    const brightness = /brightness\(([\d.]+)\)/.exec(style.filter)
    const matrix = /^matrix\(([\d.-]+),/.exec(style.transform)
    return {
      blur: Number(blur?.[1] ?? 0),
      brightness: Number(brightness?.[1] ?? 1),
      scale: Number(matrix?.[1] ?? 1),
    }
  })
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

    test('el fondo de cada parada se ve nítido y apenas oscurecido, con su encuadre fijo', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      // En el vuelco y en la bombilla la foto va anclada a la derecha y acercada: su mate y su
      // bombilla se corren a la izquierda y el mate 3D no los tapa.
      for (const [stops, key, position, transform] of [
        [0.3, 'hero', '100% 50%', 'matrix(1.2, 0, 0, 1.2, 0, 0)'],
        [1.6, 'bombilla', '100% 50%', 'matrix(1.1, 0, 0, 1.1, 0, 0)'],
        [2.3, 'ritual', '50% 50%', 'none'],
      ] as const) {
        await scrollToStops(page, stops)
        const backdrop = page.locator('[data-backdrop][data-current="true"]')
        await expect(backdrop).toHaveAttribute('data-backdrop', key)
        const photo = backdrop.locator('img')
        await expect(photo).toHaveCSS('filter', 'brightness(0.85) saturate(0.95)')
        await expect(photo).toHaveCSS('object-position', position)
        await expect(photo).toHaveCSS('transform', transform)
      }
    })

    test('al final del agua el mate se zambulle: el texto y el raíl se apagan y la yerba llena la pantalla, sin negro', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const panels = page.locator('[data-stage-panels]')
      const rail = page.getByRole('navigation', RAIL)
      const dive = page.locator('[data-stage-dive]')
      // Apenas antes de la zambullida (justo en el borde el redondeo del scroll ya la empieza).
      await scrollToStops(page, DIVE_STOPS - 0.02)
      await expect(panels).toHaveCSS('opacity', '1')
      await expect(rail).toBeVisible()
      await expect(dive).toHaveCSS('opacity', '0')
      // En el primer 20 % de la zambullida se apagan el texto de la parada 3 y el raíl (2 px
      // después del borde: el scroll redondea y justo en el borde puede quedar apenas antes).
      await scrollToStops(page, DIVE_STOPS + (STOPS - DIVE_STOPS) * 0.2)
      await page.evaluate(() => {
        window.scrollBy(0, 2)
      })
      await expect(panels).toHaveCSS('opacity', '0')
      await expect(rail).toBeHidden()
      // Sin fundido a negro: el escenario termina con la yerba a pantalla completa.
      await expect(page.locator('[data-stage-fade]')).toHaveCount(0)
      await scrollToStops(page, STOPS)
      await expect(dive).toHaveCSS('opacity', '1')
      const box = await dive.boundingBox()
      expect(box?.x).toBeLessThanOrEqual(0)
      expect(box?.y).toBeLessThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeGreaterThanOrEqual(1440)
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThanOrEqual(900)
    })

    test('entre el final del agua y el título de la colección no hay más de una pantalla de scroll', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const title = page.getByRole('heading', { level: 2, name: 'Seis líneas para cada ronda' })
      await scrollToStops(page, DIVE_STOPS)
      const waterEnd = await page.evaluate(() => window.scrollY)
      // Una pantalla después del final del agua el título ya subió con la máscara y se lee entero.
      await page.evaluate((top) => {
        window.scrollTo(0, top + window.innerHeight)
      }, waterEnd)
      await expect(title).toBeInViewport({ ratio: 1 })
      await expect(title.locator('[data-entrance-title]')).toHaveCSS('transform', 'none')
      // En el medio no hay una pantalla vacía: la capa de yerba tapa el escenario mientras se va.
      await scrollToEntry(page, 0.1)
      await expect(page.locator('[data-collection-bridge]')).toBeVisible()
      await expect(page.locator('[data-collection-yerba]')).not.toHaveCSS('opacity', '0')
    })

    test('mientras la colección sale de la yerba nunca queda más de un tercio de pantalla de fondo liso', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      // Arriba del título se ve la yerba o, a medida que se disuelve, el fondo liso: la parte de la
      // pantalla que queda lisa es la de arriba del título por lo que la yerba ya se fue.
      for (let entry = 0.05; entry <= 1.17; entry += 0.04) {
        await scrollToEntry(page, entry)
        const flat = await page.evaluate(async () => {
          // Motion escribe los estilos pegados al scroll en el cuadro siguiente.
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          )
          const title = document.querySelector('[data-entrance-title]')?.closest('h2')
          const yerba = document.querySelector('[data-collection-yerba]')
          if (!title || !yerba) return 1
          const top = Math.min(Math.max(title.getBoundingClientRect().top, 0), window.innerHeight)
          return (top / window.innerHeight) * (1 - Number(getComputedStyle(yerba).opacity))
        })
        expect(flat, `entrada ${entry.toFixed(2)}`).toBeLessThanOrEqual(1 / 3)
      }
    })

    test('el raíl no se ve con la colección en pantalla y la colección termina visible y sin transformaciones', async ({
      page,
    }) => {
      await gotoStore(page, '/')
      const rail = page.getByRole('navigation', RAIL)
      const cards = page.locator('[data-entrance-card]')
      await scrollToEntry(page, 0.3)
      await expect(rail).toBeHidden()
      await scrollToEntry(page, 1)
      await expect(rail).toBeHidden()
      // La yerba ya casi se disolvió (termina de irse con la colección arriba de todo); la capa
      // sigue tapando el 15 % del escenario que se va.
      const yerba = page.locator('[data-collection-yerba]')
      await expect
        .poll(() => yerba.evaluate((element) => Number(getComputedStyle(element).opacity)))
        .toBeLessThan(0.3)
      await expect(cards).toHaveCount(7)
      for (const card of await cards.all()) {
        await expect(card).toHaveCSS('transform', 'none')
        await expect(card).toHaveCSS('filter', 'none')
        await expect(card).toHaveCSS('opacity', '1')
      }
      await expect(
        page.getByRole('heading', { level: 2, name: 'Seis líneas para cada ronda' }),
      ).toBeInViewport()
      // Después, la pista horizontal sigue igual: con la colección clavada, las tarjetas se corren.
      const first = cards.first()
      const before = (await first.boundingBox())?.x ?? 0
      await page.mouse.wheel(0, 600)
      await expect.poll(async () => (await first.boundingBox())?.x ?? 0).toBeLessThan(before - 100)
      await expect(rail).toBeHidden()
      // Con la colección clavada el escenario ya se fue: la capa de yerba tampoco se ve.
      await expect(page.locator('[data-collection-bridge]')).toBeHidden()
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

test.describe('tienda: el Manifiesto con las cifras, clavado (1440 × 900)', () => {
  test.skip(({ isMobile }) => isMobile, 'Se clava solo en escritorio; en el celular va apilado.')
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

  test('la frase entera y la banda quedan quietas y el kit sube por encima', async ({ page }) => {
    await gotoStore(page, '/')
    const block = page.locator('[data-manifesto-block]')
    const trackTop = await climbToManifesto(page, 900)
    // Clavada arriba, con la frase entera y la banda de cifras abajo.
    await expect.poll(async () => (await block.boundingBox())?.y).toBe(0)
    await expect(page.getByText('Piezas en catálogo')).toBeInViewport()
    await expect
      .poll(() =>
        block
          .locator('.home-manifesto p span')
          .evaluateAll((words) =>
            Math.min(...words.map((word) => Number(getComputedStyle(word).opacity))),
          ),
      )
      .toBe(1)
    // Más abajo sigue en su lugar, desenfocada, oscurecida y achicada (Ruling MR-18), y el kit sube
    // por encima con una sombra hacia arriba en su borde.
    await page.evaluate((top) => {
      window.scrollTo(0, top + 450)
    }, trackTop)
    await expect.poll(async () => (await block.boundingBox())?.y).toBe(0)
    await expect.poll(async () => (await coverOf(block)).blur).toBeGreaterThan(1)
    const cover = await coverOf(block)
    expect(cover.brightness).toBeLessThan(0.9)
    expect(cover.scale).toBeLessThan(1)
    await expect(block.locator('xpath=following-sibling::div[1]')).toHaveCSS(
      'box-shadow',
      /rgba\(0, 0, 0, 0\.6\) 0px -24px 48px -20px/,
    )
    await expect(
      page.getByRole('heading', { level: 2, name: /Mate, bombilla y\s*yerba/ }),
    ).toBeInViewport()
  })
})

// La ventana útil de una laptop de 1366 × 768 (con la barra del navegador) mide ~657 de alto: ahí la
// frase, el link y la banda de cifras no entraban juntos y el overflow del bloque cortaba el link.
test.describe('tienda: el Manifiesto clavado en una laptop (1366 × 657)', () => {
  test.skip(({ isMobile }) => isMobile, 'Se clava solo en escritorio; en el celular va apilado.')
  test.use({ viewport: { width: 1366, height: 657 }, reducedMotion: 'no-preference' })

  test('la frase, el link y la banda de cifras entran enteros entre el header y el borde', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const block = page.locator('[data-manifesto-block]')
    await climbToManifesto(page, 657)
    await expect.poll(async () => (await block.boundingBox())?.y).toBe(0)
    const header = await page.getByRole('banner').boundingBox()
    const phrase = await block.locator('.home-manifesto p').boundingBox()
    const link = await block.locator('.home-manifesto-cta').boundingBox()
    const band = await block.locator('.home-bg-stats').boundingBox()
    if (header === null || phrase === null || link === null || band === null) {
      throw new Error('Falta el header, la frase, el link o la banda de cifras.')
    }
    // La frase no queda bajo el header (64 px, aunque esté escondido), el link termina antes de la
    // banda y la banda, dentro de la ventana.
    expect(phrase.y).toBeGreaterThanOrEqual(header.height)
    expect(link.y + link.height).toBeLessThanOrEqual(band.y)
    expect(band.y + band.height).toBeLessThanOrEqual(657)
  })

  test('con el mouse encima, el link se llena y su texto se pone blanco (Ruling MR-16)', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const block = page.locator('[data-manifesto-block]')
    await climbToManifesto(page, 657)
    const link = block.locator('.home-manifesto-cta')
    // Primero el bloque clavado y la entrada del Manifiesto terminada (el texto sube con el
    // scroll): si el link todavía se mueve, el puntero queda afuera y no hay `:hover`.
    await expect.poll(async () => (await block.boundingBox())?.y).toBe(0)
    // Clavado, el bloque queda a fracciones de píxel del borde: 0,95 alcanza para "entero".
    await expect(link).toBeInViewport({ ratio: 0.95 })
    let previousTop = Number.NaN
    await expect
      .poll(
        async () => {
          const top = await link.evaluate((element) => element.getBoundingClientRect().top)
          const still = Math.abs(top - previousTop) < 0.5
          previousTop = top
          return still
        },
        { intervals: [150] },
      )
      .toBe(true)
    // En reposo va en cobre claro (`accent-300`), para leerse sobre la foto.
    await expect(link).toHaveCSS('color', 'rgb(230, 189, 145)')
    await expect(async () => {
      await link.hover()
      await expect(link).toHaveCSS('color', 'rgb(255, 255, 255)', { timeout: 1500 })
    }).toPass({ timeout: 10_000 })
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

test.describe('tienda: la palabra GALPÓN del pie sube en ola (1905 × 950)', () => {
  test.skip(({ isMobile }) => isMobile, 'La ola del celular tiene 12 franjas: se prueba aparte.')
  test.use({ viewport: { width: 1905, height: 950 }, reducedMotion: 'no-preference' })

  test('20 franjas que suben una tras otra de izquierda a derecha y al final quedan enteras', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const strips = page.locator('footer.site-footer [data-wordmark-strip]')
    await expect(strips).toHaveCount(20)
    // Al hidratar, el escenario y el clavado le dan su alto a la página: esperar a que quede quieto.
    let lastHeight = 0
    await expect
      .poll(
        async () => {
          const height = await page.evaluate(() => document.documentElement.scrollHeight)
          const settled = height === lastHeight
          lastHeight = height
          return settled
        },
        { intervals: [500], timeout: 15_000 },
      )
      .toBe(true)
    const opacities = async (): Promise<number[]> =>
      await strips.evaluateAll((elements) =>
        elements.map((element) => Number(getComputedStyle(element).opacity)),
      )
    /** Deja el scroll a `share` veces el alto del pie del final de la página. */
    const scrollFromEnd = async (share: number): Promise<void> => {
      await page.evaluate((fraction) => {
        const footerHeight = document.querySelector('footer.site-footer')?.clientHeight ?? 0
        const end = document.documentElement.scrollHeight - window.innerHeight
        window.scrollTo(0, end - fraction * footerHeight - 300)
        window.scrollTo(0, end - fraction * footerHeight)
      }, share)
      await page.waitForTimeout(500)
    }

    // A mitad de la subida la palabra es una ola: las de la izquierda ya subieron y las de la
    // derecha todavía esperan, y cada una va más atrás que la de su izquierda.
    await scrollFromEnd(0.25)
    await expect.poll(async () => (await opacities())[0]).toBeGreaterThan(0.5)
    const midway = await opacities()
    expect(midway[19]).toBeLessThan(0.5)
    for (let index = 1; index < midway.length; index += 1) {
      expect(midway[index]).toBeLessThanOrEqual((midway[index - 1] ?? 0) + 0.001)
    }

    // Al final, todas enteras y encendidas.
    await scrollFromEnd(0)
    await expect.poll(async () => Math.min(...(await opacities()))).toBe(1)
    const clips = await strips
      .locator('[data-wordmark-layer="lit"]')
      .evaluateAll((elements) => elements.map((element) => (element as HTMLElement).style.clipPath))
    // Sin recorte arriba (el navegador puede acortar los ceros de `inset(0% 0 0 0)`).
    expect(clips).toHaveLength(20)
    for (const clip of clips) expect(clip).toMatch(/^inset\(0%/)
  })
})
