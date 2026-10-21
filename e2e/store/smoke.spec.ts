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
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Galpón Mates' })).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(CATEGORY_NAMES.length)
    for (const name of CATEGORY_NAMES) {
      await expect(page.getByRole('listitem').filter({ hasText: name })).toBeVisible()
    }
  })

  test('el navegador lee los ajustes por /api/v1 y muestra el descuento del kit', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByText('Descuento del kit: 10%')).toBeVisible()
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
