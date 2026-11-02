import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Las seis líneas de productos, como las muestra la página de inicio. */
const CATEGORY_NAMES = [
  'Imperiales',
  'Torpedos',
  'Camioneros',
  'Ranchero y Galleta',
  'Bombillones',
  'Yerbas',
]

test.describe('tienda: humo', () => {
  test('la página de inicio muestra el título y las seis líneas', async ({ page }) => {
    await gotoStore(page, '/')
    await expect(
      page.getByRole('heading', { level: 1, name: /Encontrá\s*tu mate\./ }),
    ).toBeVisible()
    const main = page.getByRole('main')
    for (const name of CATEGORY_NAMES) {
      await expect(main.getByRole('link', { name: new RegExp(name) }).first()).toBeAttached()
    }
  })

  test('la barra de arrepentimiento va justo debajo del encabezado, a la vista', async ({
    page,
  }) => {
    await gotoStore(page, '/')
    const link = page.getByRole('link', { name: 'Botón de arrepentimiento' }).first()
    await expect(link).toBeInViewport()
    const header = await page.getByRole('banner').boundingBox()
    const bar = await link.boundingBox()
    expect(header?.y).toBe(0)
    // El link va centrado en la barra de 32 px, que empieza donde termina el encabezado.
    const headerBottom = (header?.y ?? 0) + (header?.height ?? 0)
    expect(bar?.y ?? 0).toBeGreaterThanOrEqual(headerBottom)
    expect(bar?.y ?? 0).toBeLessThan(headerBottom + 32)
  })

  test('el navegador lee el catálogo por /api/v1 al abrir el buscador', async ({ page }) => {
    await gotoStore(page, '/')
    const catalog = page.waitForResponse(
      (response) => response.url().includes('/api/v1/products') && response.status() === 200,
    )
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await catalog
    await expect(page.getByRole('searchbox', { name: 'Buscar' })).toBeVisible()
  })

  test('la página del kit muestra el descuento que viene de los ajustes', async ({ page }) => {
    await gotoStore(page, '/kit')
    await expect(page.getByText('el kit tiene −10% sobre el total')).toBeVisible()
  })

  test('GET /api/v1/categories responde 200 con seis líneas', async ({ request }) => {
    const response = await request.get('/api/v1/categories')
    expect(response.status()).toBe(200)
    const categories: unknown = await response.json()
    expect(categories).toHaveLength(CATEGORY_NAMES.length)
  })

  test('la respuesta de la página de inicio trae la cabecera de CSP', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.headers()['content-security-policy']).toContain("default-src 'self'")
  })
})
