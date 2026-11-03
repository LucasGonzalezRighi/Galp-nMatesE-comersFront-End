import type { Locator, Page } from '@playwright/test'
import { gotoStore, INTRO_LAYER } from '../support/store'
import { expect, test } from '../support/test'

/** Nombre accesible de la sección del mate 3D y de su raíl. */
const STAGE = { name: 'El mate', exact: true } as const
const RAIL = { name: 'Paradas del mate' } as const

/** El carrusel del v4 (Ruling IC-8) y su pila de tarjetas. */
const CAROUSEL = '[data-hero-carousel]'
const STACK = '[data-hero-stack]'

/** Ancho del documento que sobra a los costados (0 si no hay scroll horizontal). */
async function horizontalOverflow(page: Page): Promise<number> {
  return await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

/** La caja de un elemento en la página; falla si no se dibuja. */
async function box(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const rect = await locator.boundingBox()
  if (rect === null) throw new Error('El elemento no tiene caja.')
  return rect
}

/** La transformación calculada de la segunda tarjeta de la pila (la que asoma detrás de la actual). */
async function secondCardTransform(page: Page): Promise<string> {
  return await page
    .locator(`${STACK} [data-hero-card]`)
    .nth(1)
    .evaluate((card) => getComputedStyle(card).transform)
}

/** El nombre de la pieza actual (el único `h2` de la portada que se lee). */
function currentName(page: Page): Locator {
  return page.locator(CAROUSEL).getByRole('heading', { level: 2 })
}

test.describe('tienda: la portada del v4 en el celular (390 × 844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('píldora, título, pila, texto, controles y botones en ese orden, con la pila plana en la primera pantalla', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const hero = page.locator(CAROUSEL)
    await expect(hero).toBeVisible()
    const pill = await box(hero.getByText('Galpón Mates'))
    const title = await box(page.getByRole('heading', { level: 1, name: /Encontrá\s*tu mate\./ }))
    const stack = await box(page.locator(STACK))
    const info = await box(currentName(page))
    const arrows = await box(page.getByRole('button', { name: 'Pieza siguiente' }))
    const ctas = await box(page.getByRole('link', { name: 'Ver la tienda' }))
    expect(pill.y).toBeLessThan(title.y)
    expect(title.y + title.height).toBeLessThanOrEqual(stack.y)
    expect(stack.y + stack.height).toBeLessThanOrEqual(info.y)
    expect(info.y).toBeLessThan(arrows.y)
    expect(arrows.y + arrows.height).toBeLessThanOrEqual(ctas.y)
    // La foto, que es el gancho, entra entera en la primera pantalla.
    expect(stack.y + stack.height).toBeLessThanOrEqual(844)
    // Pila plana: las tarjetas solo se corren y se achican, sin giro 3D.
    expect(await secondCardTransform(page)).toMatch(/^matrix\(/)
    await expect(page.getByRole('region', STAGE)).toHaveCount(0)
    await expect(page.getByRole('navigation', RAIL)).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.locator('.home-scene')).toHaveCount(0)
    expect(await horizontalOverflow(page)).toBe(0)
  })

  test('las flechas y el dedo cambian de pieza, sin avance solo, y Agregar suma la actual al carrito', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    await expect(currentName(page)).toHaveText('Mate Imperial Premium')
    await page.getByRole('button', { name: 'Pieza siguiente' }).click()
    await expect(currentName(page)).toHaveText('Bombillón Premium Curvo')
    await expect(page.locator(CAROUSEL).getByText('02 — 05')).toBeVisible()
    // Deslizar 80 px hacia la izquierda sobre la pila trae la siguiente.
    const stack = await box(page.locator(STACK))
    const y = stack.y + stack.height / 2
    await page.mouse.move(stack.x + stack.width * 0.6, y)
    await page.mouse.down()
    await page.mouse.move(stack.x + stack.width * 0.6 - 80, y, { steps: 6 })
    await page.mouse.up()
    await expect(currentName(page)).toHaveText('Yerba Canarias 1 kg')
    await expect(page).toHaveURL('/')
    // Sin avance solo: sigue en la misma pieza.
    await page.waitForTimeout(6000)
    await expect(currentName(page)).toHaveText('Yerba Canarias 1 kg')
    await page.getByRole('button', { name: 'Agregar Yerba Canarias 1 kg al carrito' }).click()
    await expect(page.getByRole('button', { name: /^Abrir carrito/ })).toHaveAccessibleName(
      'Abrir carrito, 1 producto',
    )
  })

  test('la tarjeta actual lleva a la ficha', async ({ page }) => {
    await gotoStore(page, '/')
    await page.locator(STACK).getByRole('link', { name: 'Mate Imperial Premium' }).click()
    await expect(page).toHaveURL('/producto/mate-imperial-premium')
  })
})

test.describe('tienda: la portada del v4 en la tableta (768 × 1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('el layout del v4 con el giro: el texto arriba y la pila debajo, sin lienzo', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    await expect(page.locator(CAROUSEL)).toBeVisible()
    const ctas = await box(page.getByRole('link', { name: 'Ver la tienda' }))
    const stack = await box(page.locator(STACK))
    expect(stack.y).toBeGreaterThan(ctas.y + ctas.height)
    // Desde 768 px las tarjetas de atrás giran sobre su eje vertical.
    expect(await secondCardTransform(page)).toMatch(/^matrix3d\(/)
    await expect(page.locator('canvas')).toHaveCount(0)
    expect(await horizontalOverflow(page)).toBe(0)
  })
})

test.describe('tienda: la portada del v4 con menos movimiento (1440 × 900)', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('el texto a la izquierda y la pila a la derecha, sin mate 3D, y todo cambia sin transición', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const hero = page.locator(CAROUSEL)
    await expect(hero).toBeVisible()
    const title = await box(page.getByRole('heading', { level: 1 }))
    const stack = await box(page.locator(STACK))
    expect(stack.x).toBeGreaterThan(title.x + title.width)
    expect(stack.y).toBeLessThan(900)
    await expect(page.getByRole('region', STAGE)).toHaveCount(0)
    await expect(page.getByRole('navigation', RAIL)).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.locator('.home-scene')).toHaveCount(0)
    // Nada del carrusel queda escondido con un estilo en línea esperando una animación.
    const hidden = await hero
      .locator('[style]')
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute('style') ?? '')
          .filter(
            (style) =>
              /opacity:\s*0(?![.\d])/.test(style) || /translate[XY]?\((?!calc|0)/.test(style),
          ),
      )
    expect(hidden).toEqual([])
    const card = page.locator(`${STACK} [data-hero-card]`).first()
    expect(await card.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
      '0s',
    )
    await page.getByRole('button', { name: 'Pieza siguiente' }).click()
    await expect(currentName(page)).toHaveText('Bombillón Premium Curvo')
    await expect(hero.locator('[data-hero-word]')).toHaveText('Bombillas')
  })
})

/** Lo que cuenta {@link watchCarousel}: cuadros pintados y en cuántos se veía el carrusel. */
interface CarouselFrames {
  /** Cuadros contados desde la carga. */
  frames: number
  /** Cuadros en los que el carrusel estaba en la página sin la tapa ni la intro encima. */
  visible: number
}

/**
 * Desde el primer cuadro de la próxima carga, antes de cada pintado, cuenta si el carrusel está en
 * la página sin nada que lo tape (ni la tapa del servidor ni la intro, salvo mientras se abre).
 */
async function watchCarousel(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const seen = { frames: 0, visible: 0 }
    Object.assign(window, { heroSeen: seen })
    const covered = (): boolean => {
      if (document.querySelector('[data-intro-cover]') !== null) return true
      const phase = document.querySelector('[data-intro]')?.getAttribute('data-phase')
      return phase !== undefined && phase !== null && phase !== 'opening'
    }
    const tick = (): void => {
      seen.frames += 1
      if (document.querySelector('[data-hero-carousel]') !== null && !covered()) seen.visible += 1
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

/** Carga el inicio, deja correr la intro entera y devuelve lo que contó {@link watchCarousel}. */
async function loadThroughIntro(page: Page): Promise<CarouselFrames> {
  await watchCarousel(page)
  await gotoStore(page, '/', { intro: 'keep' })
  // El encabezado puede hidratar antes que el inicio: primero se va la tapa (ya está la intro) y
  // después termina la intro.
  await expect(page.locator('[data-intro-cover]')).toHaveCount(0, { timeout: 10_000 })
  await expect(page.locator(INTRO_LAYER)).toHaveCount(0, { timeout: 15_000 })
  return await page.evaluate(() => (window as unknown as { heroSeen: CarouselFrames }).heroSeen)
}

test.describe('tienda: en escritorio con el mate 3D (1440 × 900)', () => {
  test.skip(({ isMobile }) => isMobile, 'El mate 3D es de escritorio.')
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })

  test('el carrusel del v4 no se ve en ningún cuadro: la intro lo tapa hasta que está el mate 3D', async ({
    page,
  }) => {
    const seen = await loadThroughIntro(page)
    await expect(page.getByRole('region', STAGE)).toBeAttached()
    await expect(page.locator(CAROUSEL)).toHaveCount(0)
    expect(seen.frames).toBeGreaterThan(30)
    expect(seen.visible).toBe(0)
  })
})

test.describe('tienda: control del contador de cuadros (1440 × 650, sin 3D por el alto)', () => {
  test.skip(({ isMobile }) => isMobile, 'Alcanza con escritorio.')
  test.use({ viewport: { width: 1440, height: 650 }, reducedMotion: 'no-preference' })

  test('donde no hay mate 3D el contador sí ve el carrusel cuando se abre la intro', async ({
    page,
  }) => {
    const seen = await loadThroughIntro(page)
    await expect(page.locator(CAROUSEL)).toBeVisible()
    expect(seen.visible).toBeGreaterThan(0)
  })
})
