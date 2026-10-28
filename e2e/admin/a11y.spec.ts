import {
  ADMIN_SCREENS,
  expireSession,
  gotoAdmin,
  logInAsAdmin,
  screenHeading,
  toast,
} from '../support/admin'
import { seriousViolations } from '../support/axe'
import { expect, test } from '../support/test'

/**
 * Pantallas con sesión que revisa axe: todas las de `ADMIN_SCREENS` salvo Líneas, que se revisa
 * en su propio caso junto con el diálogo de una línea nueva.
 */
const AUDITED = [
  'dashboard',
  'products',
  'product-new',
  'product-photos',
  'orders',
  'order',
  'content-home',
  'content-about',
  'content-faq',
  'content-tabs',
  'content-footer',
  'content-legal',
  'settings',
  'reviews',
  'messages',
  'account',
]

// Con movimiento reducido los diálogos quedan en su estado final: axe no mide el contraste de un
// elemento a medio aparecer.
test.use({ reducedMotion: 'reduce' })

test.describe('dashboard: accesibilidad (axe)', () => {
  test('ingreso no tiene violaciones serias ni críticas', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  for (const screen of ADMIN_SCREENS.filter((item) => AUDITED.includes(item.name))) {
    test(`${screen.name} (${screen.path}) no tiene violaciones serias ni críticas`, async ({
      page,
    }) => {
      await logInAsAdmin(page)
      await gotoAdmin(page, screen)
      expect(await seriousViolations(page)).toEqual([])
    })
  }

  test('líneas con el diálogo de una línea nueva abierto', async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/lineas', heading: 'Líneas' })
    expect(await seriousViolations(page)).toEqual([])
    await page.getByRole('button', { name: 'Nueva línea' }).click()
    await expect(page.getByRole('dialog', { name: 'Nueva línea' })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test('pedido con el diálogo de despacho abierto', async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/pedidos/GLP-09001', heading: 'Pedido GLP-09001' })
    await page.getByRole('button', { name: 'Marcar como despachado' }).click()
    await expect(page.getByRole('dialog', { name: 'Despachar el pedido GLP-09001' })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test('la página que no existe', async ({ page }) => {
    await logInAsAdmin(page)
    await page.goto('/no-existe')
    await expect(page.getByText('No encontramos esa página').first()).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test('teclado: Enter abre un diálogo con el foco en el primer campo y Escape lo cierra', async ({
    page,
  }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/lineas', heading: 'Líneas' })
    await page.getByRole('button', { name: 'Nueva línea' }).focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Nueva línea' })
    await expect(dialog.getByRole('textbox', { name: 'Nombre' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('teclado: al cerrar un diálogo el foco vuelve al botón que lo abrió', async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/lineas', heading: 'Líneas' })
    const open = page.getByRole('button', { name: 'Nueva línea' })
    await open.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Nueva línea' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(open).toBeFocused({ timeout: 2000 })
  })

  test('teclado: al cerrar la confirmación de "Archivar" el foco vuelve al menú de la fila', async ({
    page,
  }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/productos', heading: 'Productos' })
    const menu = page.getByRole('button', { name: /^Acciones de / }).first()
    await menu.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('menuitem', { name: 'Archivar' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(confirm).toBeHidden()
    await expect(menu).toBeFocused({ timeout: 2000 })
  })

  test('teclado: al confirmar "Archivar" el foco va al título y no al body', async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/productos', heading: 'Productos' })
    await page
      .getByRole('button', { name: /^Acciones de / })
      .first()
      .focus()
    await page.keyboard.press('Enter')
    await page.getByRole('menuitem', { name: 'Archivar' }).click()
    const confirm = page.getByRole('alertdialog')
    await confirm.getByRole('button', { name: 'Archivar' }).click()
    await expect(toast(page, 'Producto archivado.')).toBeVisible()
    await expect(confirm).toBeHidden()
    await expect(screenHeading(page, 'Productos')).toBeFocused({ timeout: 2000 })
  })

  test('el diálogo de sesión vencida', async ({ page }) => {
    await page.clock.install()
    await logInAsAdmin(page)
    await expireSession(page)
    expect(await seriousViolations(page)).toEqual([])
  })
})
