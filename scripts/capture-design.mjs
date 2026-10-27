// @ts-check
/* global document, window, getComputedStyle, HTMLElement */
/**
 * Genera las capturas de referencia del diseño de la tienda (`docs/design/galpon-tienda-v3`).
 *
 * Abre el bundle original del diseño por `file://` con Chromium (Playwright), recorre cada pantalla,
 * dispara las apariciones con scroll y guarda PNG en `docs/design/galpon-tienda-v3/screens/`:
 * página completa a 1440 × 900 y a 390 × 844 (`<pantalla>-<1440|390>.png`), el inicio por escena
 * (`home-scene-<0..6>-1440.png`), los paneles abiertos (carrito, búsqueda y menú móvil) y el
 * checkout en sus tres pasos más la pantalla de gracias (`checkout-<paso>-<1440|390>.png`).
 *
 * Uso: `npm run design:capture` (todo) o `npm run design:capture -- cart home-scene` (solo las
 * capturas cuyo nombre contenga alguno de esos textos). No corre en CI.
 *
 * @module
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Raíz del workspace (`frontend/`). */
const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Carpeta del diseño de referencia. */
const DESIGN_DIR = join(ROOT, 'docs', 'design', 'galpon-tienda-v3')

/** Bundle original del diseño: un solo HTML que se abre sin servidor. */
const BUNDLE_URL = pathToFileURL(join(DESIGN_DIR, 'galpon-mates-bundle.html')).href

/** Destino de las PNG. */
const SCREENS_DIR = join(DESIGN_DIR, 'screens')

/** Tamaños de pantalla capturados: escritorio y teléfono. */
const VIEWPORTS = /** @type {const} */ ([
  { label: '1440', width: 1440, height: 900 },
  { label: '390', width: 390, height: 844 },
])

/** Pantallas de página completa: nombre del archivo y ruta del diseño (hash). */
const PAGES = [
  { name: 'home', hash: '#/inicio' },
  { name: 'shop', hash: '#/tienda' },
  { name: 'shop-bombillones', hash: '#/tienda/bombillones' },
  { name: 'product-imperial-premium', hash: '#/producto/imperial-premium' },
  { name: 'product-galleta', hash: '#/producto/galleta' },
  { name: 'kit', hash: '#/kit' },
  { name: 'about', hash: '#/nosotros' },
  { name: 'faq', hash: '#/faq' },
  { name: 'contact', hash: '#/contacto' },
]

/** Escenas del inicio (`data-sc` 0 a 6): el mate 3D cambia de pose en cada una. */
const HOME_SCENES = [0, 1, 2, 3, 4, 5, 6]

/** Texto de la búsqueda de ejemplo. */
const SEARCH_QUERY = 'mate'

/** Datos del checkout de ejemplo: los mismos nombres que usa `e2e/store/visual.spec.ts`. */
const CHECKOUT_DATA = {
  email: 'lucia@ejemplo.com',
  firstName: 'Lucía',
  lastName: 'Pérez',
  street: 'Av. Corrientes',
  number: '1234',
  postalCode: '1414',
  city: 'Buenos Aires',
  province: 'CABA',
}

/** Nombres pedidos por línea de comandos para capturar solo algunos archivos. */
const FILTERS = process.argv.slice(2)

/**
 * Indica si hay que generar una captura según los filtros de la línea de comandos.
 *
 * @param {string} name - Nombre base del archivo, sin tamaño ni extensión.
 * @returns {boolean} `true` si no hay filtros o alguno aparece en el nombre.
 */
function wanted(name) {
  return FILTERS.length === 0 || FILTERS.some((filter) => name.includes(filter))
}

/**
 * Escribe una línea de progreso en la salida estándar.
 *
 * @param {string} line - Texto a mostrar.
 */
function log(line) {
  process.stdout.write(`${line}\n`)
}

/**
 * Avisa de un problema que no detiene las capturas.
 *
 * @param {string} line - Texto del aviso.
 */
function warn(line) {
  process.stderr.write(`Aviso: ${line}\n`)
}

/**
 * Espera a que terminen las animaciones finitas (las infinitas del diseño, como el giro o el flote,
 * se ignoran) y, si no terminan a tiempo, avisa y sigue.
 *
 * @param {import('@playwright/test').Page} page - Página del diseño.
 */
async function settleAnimations(page) {
  try {
    await page.waitForFunction(
      () =>
        document
          .getAnimations()
          .every(
            (animation) =>
              animation.playState !== 'running' ||
              animation.effect?.getTiming().iterations === Infinity,
          ),
      undefined,
      { timeout: 8000 },
    )
  } catch {
    warn('algunas animaciones siguen corriendo; se captura igual.')
  }
}

/**
 * Abre el diseño en una página nueva (con almacenamiento vacío) y espera a que esté listo.
 *
 * @param {import('@playwright/test').Browser} browser - Navegador compartido.
 * @param {{ width: number, height: number }} viewport - Tamaño de la ventana.
 * @param {string} hash - Ruta del diseño, por ejemplo `#/tienda`.
 * @returns {Promise<{ page: import('@playwright/test').Page, close: () => Promise<void> }>} La página y cómo cerrarla.
 */
async function openDesign(browser, viewport, hash) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => {
    warn(`error de la página: ${error.message}`)
  })
  await page.goto(`${BUNDLE_URL}${hash}`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForSelector('main')
  // El mate 3D del inicio aparece con fundido al terminar de cargar.
  try {
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector('[data-3d]')
        return canvas === null || Number.parseFloat(getComputedStyle(canvas).opacity) > 0.9
      },
      undefined,
      { timeout: 20000 },
    )
  } catch {
    warn(`el mate 3D no cargó en ${hash}.`)
  }
  await page.waitForTimeout(800)
  await settleAnimations(page)
  return { page, close: () => context.close() }
}

/**
 * Recorre la página con scroll para disparar las apariciones y espera a que terminen (incluidos los
 * contadores numéricos, que cuentan durante unos 2 s).
 *
 * @param {import('@playwright/test').Page} page - Página del diseño.
 * @param {number} viewportHeight - Alto de la ventana.
 */
async function revealAll(page, viewportHeight) {
  const step = Math.round(viewportHeight * 0.5)
  const pageHeight = () => page.evaluate(() => document.documentElement.scrollHeight)
  for (let top = 0; top < (await pageHeight()); top += step) {
    await page.evaluate((y) => {
      window.scrollTo(0, y)
    }, top)
    await page.waitForTimeout(90)
  }
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await page.waitForTimeout(2200)
  await settleAnimations(page)
}

/**
 * Vuelve al inicio de la página, enciende las palabras del texto que se ilumina con el scroll
 * (`data-scrub`) y oculta los paneles fijos que esperan fuera de la ventana, para que la captura de página
 * completa se lea entera y limpia.
 *
 * @param {import('@playwright/test').Page} page - Página del diseño.
 */
async function prepareFullPage(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    for (const word of document.querySelectorAll('[data-scrub] [data-w]')) {
      if (word instanceof HTMLElement) word.style.opacity = '1'
    }
    // La cortina de transición, el carrito y otros paneles fijos esperan fuera de la ventana; en una
    // captura de página completa quedarían dibujados sobre el contenido.
    for (const element of document.querySelectorAll('body *')) {
      if (!(element instanceof HTMLElement) || getComputedStyle(element).position !== 'fixed')
        continue
      const box = element.getBoundingClientRect()
      if (box.top >= window.innerHeight || box.left >= window.innerWidth) {
        element.style.visibility = 'hidden'
      }
    }
  })
}

/**
 * Guarda una captura en `screens/`.
 *
 * @param {import('@playwright/test').Page} page - Página del diseño.
 * @param {string} file - Nombre del archivo, sin extensión.
 * @param {boolean} fullPage - `true` para la página entera, `false` para lo que se ve en la ventana.
 */
async function save(page, file, fullPage) {
  await page.screenshot({ path: join(SCREENS_DIR, `${file}.png`), fullPage, scale: 'css' })
  log(`  ${file}.png`)
}

/**
 * Captura una pantalla de página completa en un tamaño.
 *
 * @param {import('@playwright/test').Browser} browser - Navegador compartido.
 * @param {(typeof VIEWPORTS)[number]} viewport - Tamaño de la ventana.
 * @param {{ name: string, hash: string }} screen - Pantalla a capturar.
 */
async function captureFullPage(browser, viewport, screen) {
  const { page, close } = await openDesign(browser, viewport, screen.hash)
  try {
    await revealAll(page, viewport.height)
    await prepareFullPage(page)
    await save(page, `${screen.name}-${viewport.label}`, true)
  } finally {
    await close()
  }
}

/**
 * Captura el inicio por escena (a 1440 px) y el final de la colección horizontal.
 *
 * @param {import('@playwright/test').Browser} browser - Navegador compartido.
 * @param {(typeof VIEWPORTS)[number]} viewport - Tamaño de la ventana.
 */
async function captureHomeScenes(browser, viewport) {
  const scenes = HOME_SCENES.filter((scene) => wanted(`home-scene-${String(scene)}`))
  const collection = wanted('home-collection')
  if (scenes.length === 0 && !collection) return
  const { page, close } = await openDesign(browser, viewport, '#/inicio')
  try {
    await revealAll(page, viewport.height)
    for (const scene of scenes) {
      // La escena 0 es el arranque de la página; las demás se centran para que el mate 3D tome su pose.
      await page.evaluate((index) => {
        const section = document.querySelector(`[data-sc="${String(index)}"]`)
        if (section === null) return
        const box = section.getBoundingClientRect()
        const top =
          index === 0 ? 0 : box.top + window.scrollY + box.height / 2 - window.innerHeight / 2
        window.scrollTo(0, top)
      }, scene)
      await page.waitForTimeout(2200)
      await settleAnimations(page)
      await save(page, `home-scene-${String(scene)}-${viewport.label}`, false)
    }
    if (collection) {
      await page.evaluate(() => {
        const section = document.querySelector('[data-hscroll]')
        if (section === null) return
        const box = section.getBoundingClientRect()
        window.scrollTo(0, box.top + window.scrollY + box.height - window.innerHeight)
      })
      await page.waitForTimeout(1500)
      await save(page, `home-collection-end-${viewport.label}`, false)
    }
  } finally {
    await close()
  }
}

/**
 * Captura la búsqueda abierta, vacía y con un texto escrito.
 *
 * @param {import('@playwright/test').Browser} browser - Navegador compartido.
 * @param {(typeof VIEWPORTS)[number]} viewport - Tamaño de la ventana.
 */
async function captureSearch(browser, viewport) {
  const { page, close } = await openDesign(browser, viewport, '#/tienda')
  try {
    await page.getByRole('button', { name: 'Buscar' }).first().click()
    await page.waitForTimeout(900)
    await save(page, `search-${viewport.label}`, false)
    await page.getByPlaceholder(/Buscá un mate/).pressSequentially(SEARCH_QUERY, { delay: 60 })
    await page.waitForTimeout(900)
    await save(page, `search-results-${viewport.label}`, false)
  } finally {
    await close()
  }
}

/**
 * Captura el menú móvil abierto (solo existe en pantallas angostas). Se abre sobre la tienda y no sobre
 * el inicio, donde el mate 3D se dibuja encima de los enlaces.
 *
 * @param {import('@playwright/test').Browser} browser - Navegador compartido.
 * @param {(typeof VIEWPORTS)[number]} viewport - Tamaño de la ventana.
 */
async function captureMenu(browser, viewport) {
  const { page, close } = await openDesign(browser, viewport, '#/tienda')
  try {
    await page.getByRole('button', { name: 'Menú' }).click()
    await page.waitForTimeout(900)
    await save(page, `menu-${viewport.label}`, false)
  } finally {
    await close()
  }
}

/**
 * Captura el carrito abierto con un producto (Mate Imperial Premium) y un kit (Imperial Premium,
 * Bombillón Premium Curvo y Yerba Canarias), agregados como lo haría una persona.
 *
 * @param {import('@playwright/test').Browser} browser - Navegador compartido.
 * @param {(typeof VIEWPORTS)[number]} viewport - Tamaño de la ventana.
 */
async function captureCart(browser, viewport) {
  const { page, close } = await openDesign(browser, viewport, '#/producto/imperial-premium')
  try {
    await page.getByRole('button', { name: 'Agregar al carrito' }).first().click()
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      window.location.hash = '#/kit'
    })
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: /Mate Imperial Premium/ }).click()
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: /Bombillón Premium Curvo/ }).click()
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: /Yerba Canarias 1 kg/ }).click()
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Agregar kit al carrito' }).click()
    // El carrito se abre solo, unos 850 ms después de agregar el kit.
    await page.getByRole('button', { name: 'Cerrar carrito' }).first().waitFor({ state: 'visible' })
    await page.waitForTimeout(4500)
    await settleAnimations(page)
    await save(page, `cart-${viewport.label}`, false)
  } finally {
    await close()
  }
}

/**
 * Control de un campo del checkout del diseño por el texto de su `<label>` (el diseño no asocia
 * la etiqueta con `for`, así que no sirve `getByLabel`).
 *
 * @param {import('@playwright/test').Page} page - Página del diseño.
 * @param {string} label - Texto exacto de la etiqueta.
 * @returns {import('@playwright/test').Locator} El `input` o `select` del campo.
 */
function designField(page, label) {
  return page
    .locator('main .field')
    .filter({ has: page.locator('label', { hasText: new RegExp(`^${label}$`) }) })
    .locator('input, select')
    .first()
}

/**
 * Captura el paso del checkout que se ve, en página completa.
 *
 * @param {import('@playwright/test').Page} page - Página del diseño.
 * @param {(typeof VIEWPORTS)[number]} viewport - Tamaño de la ventana.
 * @param {string} name - Nombre base del archivo.
 */
async function captureCheckoutStep(page, viewport, name) {
  await page.waitForTimeout(1200)
  await settleAnimations(page)
  await revealAll(page, viewport.height)
  await prepareFullPage(page)
  await save(page, `${name}-${viewport.label}`, true)
}

/**
 * Captura el checkout con un producto (Mate Imperial de Calabaza, el mismo que usa la tienda):
 * Contacto, Envío (a domicilio) y Pago (Mercado Pago, la opción elegida de entrada) vacíos al
 * llegar, y la pantalla de gracias después de pagar.
 *
 * @param {import('@playwright/test').Browser} browser - Navegador compartido.
 * @param {(typeof VIEWPORTS)[number]} viewport - Tamaño de la ventana.
 */
async function captureCheckout(browser, viewport) {
  const { page, close } = await openDesign(browser, viewport, '#/producto/imperial-calabaza')
  try {
    await page.getByRole('button', { name: 'Agregar al carrito' }).first().click()
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      window.location.hash = '#/checkout'
    })
    await page.waitForTimeout(1500)
    await captureCheckoutStep(page, viewport, 'checkout-contact')

    await designField(page, 'Email').fill(CHECKOUT_DATA.email)
    await designField(page, 'Nombre').fill(CHECKOUT_DATA.firstName)
    await designField(page, 'Apellido').fill(CHECKOUT_DATA.lastName)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await captureCheckoutStep(page, viewport, 'checkout-shipping')

    await designField(page, 'Calle').fill(CHECKOUT_DATA.street)
    await designField(page, 'Número').fill(CHECKOUT_DATA.number)
    await designField(page, 'Código postal').fill(CHECKOUT_DATA.postalCode)
    await designField(page, 'Ciudad').fill(CHECKOUT_DATA.city)
    await designField(page, 'Provincia').selectOption(CHECKOUT_DATA.province)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await captureCheckoutStep(page, viewport, 'checkout-payment')

    // El diseño simula el pago: unos 2,2 s después muestra la pantalla de gracias.
    await page.getByRole('button', { name: /^Pagar / }).click()
    await page
      .getByText(/Gracias/)
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
    await captureCheckoutStep(page, viewport, 'checkout-result')
  } finally {
    await close()
  }
}

/**
 * Corre todas las capturas pedidas.
 */
async function main() {
  mkdirSync(SCREENS_DIR, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const viewport of VIEWPORTS) {
      log(`Capturas a ${viewport.label} px de ancho`)
      for (const screen of PAGES) {
        if (wanted(screen.name)) await captureFullPage(browser, viewport, screen)
      }
      if (viewport.label === '1440') await captureHomeScenes(browser, viewport)
      if (wanted('search')) await captureSearch(browser, viewport)
      if (viewport.label === '390' && wanted('menu')) await captureMenu(browser, viewport)
      if (wanted('cart')) await captureCart(browser, viewport)
      if (wanted('checkout')) await captureCheckout(browser, viewport)
    }
  } finally {
    await browser.close()
  }
}

await main()
