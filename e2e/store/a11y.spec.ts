import { seriousViolations } from '../support/axe'
import { gotoStore, STORE_SCREENS } from '../support/store'
import { expect, test } from '../support/test'

/**
 * Pantallas que revisa axe (WCAG 2.0, 2.1 y 2.2, A y AA, ver `e2e/support/axe.ts`): inicio, tienda,
 * una línea, producto, kit, contacto, arrepentimiento y las cuatro páginas legales.
 */
const AUDITED = [
  'home',
  'shop',
  'shop-bombillones',
  'product-imperial-premium',
  'kit',
  'contact',
  'withdrawal',
  'terms',
  'privacy',
  'cookies',
  'returns',
]

// Con movimiento reducido todo queda en su estado final: axe no mide el contraste de un elemento
// a medio aparecer.
test.use({ reducedMotion: 'reduce' })

test.describe('tienda: accesibilidad (axe)', () => {
  for (const screen of STORE_SCREENS.filter((item) => AUDITED.includes(item.name))) {
    test(`${screen.name} (${screen.path}) no tiene violaciones serias ni críticas`, async ({
      page,
    }) => {
      await gotoStore(page, screen.path)
      await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible()
      expect(await seriousViolations(page)).toEqual([])
    })
  }

  test('ingresar (/cuenta/ingresar) no tiene violaciones serias ni críticas', async ({ page }) => {
    await gotoStore(page, '/cuenta/ingresar')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ingresá a tu cuenta.' }),
    ).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test('con el carrito abierto no tiene violaciones serias ni críticas', async ({ page }) => {
    await gotoStore(page, '/tienda')
    await page
      .getByRole('button', { name: /^Agregar .+ al carrito$/ })
      .first()
      .click()
    await page.getByRole('button', { name: /^Abrir carrito/ }).click()
    await expect(page.getByRole('dialog', { name: /^Carrito/ })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })
})
