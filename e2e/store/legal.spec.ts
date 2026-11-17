import { changeMockSeller, EMPTY_SELLER, gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Las cuatro páginas legales, con el título de fábrica de cada documento. */
const LEGAL_SCREENS = [
  { path: '/terminos', heading: 'Términos y condiciones' },
  { path: '/privacidad', heading: 'Política de privacidad' },
  { path: '/cookies', heading: 'Política de cookies' },
  { path: '/devoluciones', heading: 'Cambios, devoluciones y arrepentimiento' },
] as const

/** Datos del vendedor de prueba (Review Focus 1 y 3). */
const SELLER = {
  legalName: 'Galpón Mates S. R. L.',
  cuit: '20123456786',
  taxCondition: 'Responsable inscripto',
  address: 'Av. Corrientes 1234, CABA',
  phone: null,
  supportArea: 'Atención al cliente',
  supportHours: 'Lunes a viernes de 9 a 18',
  dataFiscalUrl: 'https://qr.afip.gob.ar/?qr=abc123',
}

/** Un GIF de 1 × 1 que responde en lugar del logo de ARCA, para no depender de la red. */
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

test.describe('tienda: páginas legales', () => {
  for (const screen of LEGAL_SCREENS) {
    test(`${screen.path}: título, fecha, botón de imprimir y ningún marcador crudo`, async ({
      page,
    }) => {
      await gotoStore(page, screen.path)

      const main = page.getByRole('main')
      await expect(main).toHaveAttribute('data-legal-page', '')
      await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible()
      await expect(main.getByText(/^Última actualización: \d{2}\/\d{2}\/\d{4}$/)).toBeVisible()
      await expect(main.getByRole('button', { name: 'Imprimir o guardar como PDF' })).toBeVisible()
      expect(await main.getByRole('heading', { level: 2 }).count()).toBeGreaterThan(0)
      const text = await main.innerText()
      expect(text).not.toContain('{{')
      expect(text).not.toContain('}}')
    })
  }

  test('al imprimir quedan el documento y su título, sin el encabezado ni el pie', async ({
    page,
  }) => {
    await gotoStore(page, '/terminos')
    await page.emulateMedia({ media: 'print' })

    await expect(page.getByRole('banner')).toBeHidden()
    await expect(page.getByRole('contentinfo')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Imprimir o guardar como PDF' })).toBeHidden()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Términos y condiciones' }),
    ).toBeVisible()
  })

  test('al imprimir, un enlace externo muestra su dirección entre paréntesis y uno interno no', async ({
    page,
  }) => {
    await gotoStore(page, '/privacidad')
    const main = page.getByRole('main')
    const external = main.locator('a[data-legal-external]').first()
    const internal = main.locator('a[href^="/"]:not([data-legal-external])').first()
    const afterContent = (link: typeof external): Promise<string> =>
      link.evaluate((element) => getComputedStyle(element, '::after').content)
    await expect(external).toHaveAttribute('href', /^https:\/\//)
    expect(await afterContent(external)).toBe('none')

    await page.emulateMedia({ media: 'print' })

    const href = await external.getAttribute('href')
    expect(await afterContent(external)).toBe(`" (${href ?? ''})"`)
    expect(await afterContent(internal)).toBe('none')
  })
})

// Cambia los datos del vendedor de la base simulada, que es una sola para los dos proyectos: va
// solo en escritorio, en serie, y deja el vendedor vacío al terminar.
test.describe('tienda: datos del vendedor en los legales y en el pie', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'store-desktop',
      'Cambia la base compartida: solo escritorio.',
    )
    await page.route('https://www.afip.gob.ar/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/gif', body: PIXEL }),
    )
  })

  test.afterAll(async ({ request }, testInfo) => {
    if (testInfo.project.name === 'store-desktop') await changeMockSeller(request, EMPTY_SELLER)
  })

  test('sin datos, los términos dicen "a completar por el vendedor" y el pie no muestra el logo', async ({
    page,
    request,
  }) => {
    await changeMockSeller(request, EMPTY_SELLER)
    await gotoStore(page, '/terminos')

    const main = page.getByRole('main')
    await expect(main.getByText(/a completar por el vendedor/).first()).toBeVisible()
    expect(await main.innerText()).not.toMatch(/\{\{|\}\}/)
    const footer = page.getByRole('contentinfo')
    await expect(
      footer.getByRole('navigation', { name: 'Defensa del consumidor' }).getByRole('link'),
    ).toHaveCount(2)
    await expect(footer.getByRole('img', { name: /Data Fiscal/ })).toHaveCount(0)
  })

  test('con los datos cargados, los términos los muestran y el pie del inicio lleva el logo sin violar la CSP', async ({
    page,
    request,
  }) => {
    // La visita anterior deja al navegador precargando el inicio; en un servidor recién levantado,
    // esa primera regeneración puede terminar después de cambiar los ajustes y guardarse como
    // vigente con el pie viejo. Se espera a que el inicio esté generado antes de cambiarlos.
    await request.get('/')
    await changeMockSeller(request, SELLER)
    await gotoStore(page, '/terminos')

    const main = page.getByRole('main')
    await expect(main.getByText(/Galpón Mates S\. R\. L\./).first()).toBeVisible()
    await expect(main.getByText(/20-12345678-6/).first()).toBeVisible()
    expect(await main.innerText()).not.toContain('a completar por el vendedor')

    await gotoStore(page, '/')
    const footer = page.getByRole('contentinfo')
    await footer.scrollIntoViewIfNeeded()
    const logo = footer.getByRole('img', { name: 'Data Fiscal: datos del vendedor en ARCA' })
    await expect(logo).toBeAttached()
    await logo.scrollIntoViewIfNeeded()
    await expect
      .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0)
    await expect(logo.locator('xpath=..')).toHaveAttribute('href', SELLER.dataFiscalUrl)
    await expect(footer.getByText(/CUIT 20-12345678-6/)).toBeAttached()
  })
})
