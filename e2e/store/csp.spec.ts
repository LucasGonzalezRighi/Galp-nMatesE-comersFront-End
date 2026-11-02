import { gotoStore, STORE_SCREENS } from '../support/store'
import { expect, test } from '../support/test'

// El fixture automático `cspGuard` (ver `support/test.ts`) hace fallar cada prueba si la consola
// de la página registra una violación de la política de seguridad de contenido (CSP). Estas pruebas
// solo recorren todo lo que la tienda muestra y usa, para que el fixture tenga qué vigilar.
test.describe('tienda: política de seguridad de contenido', () => {
  for (const screen of STORE_SCREENS) {
    test(`${screen.name} (${screen.path}) responde con CSP y no la viola`, async ({ page }) => {
      const response = await page.goto(screen.path)
      const policy = response?.headers()['content-security-policy'] ?? ''
      expect(policy).toContain("default-src 'self'")
      expect(policy).toContain("object-src 'none'")
      expect(policy).toContain("frame-ancestors 'none'")
      await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible()
      await gotoStore(page, screen.path)
    })
  }

  test('el carrito, el buscador y el menú no violan la CSP al abrirse y cerrarse', async ({
    page,
    isMobile,
  }) => {
    await gotoStore(page, '/tienda')
    await page.getByRole('button', { name: 'Agregar al carrito' }).first().click()

    await page.getByRole('button', { name: /^Abrir carrito/ }).click()
    await expect(page.getByRole('dialog', { name: /^Carrito/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /^Carrito/ })).toBeHidden()

    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Buscar' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Buscar' })).toBeHidden()

    if (isMobile) {
      await page.getByRole('button', { name: 'Menú', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog', { name: 'Menú' })).toBeHidden()
    }
  })
})
