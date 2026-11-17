import type { Page } from '@playwright/test'
import type { Buyer } from '../support/checkout'
import { seriousViolations } from '../support/axe'
import {
  addToCart,
  buyerFor,
  DEFAULT_PRODUCT,
  payWithMercadoPago,
  stepForm,
  waitForResult,
} from '../support/checkout'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Contraseña de las cuentas de prueba: 10 caracteres o más, con letras y números. */
const PASSWORD = 'mate-amargo-2026'

/** Crea una cuenta desde `/cuenta/registro` y espera el resumen de la cuenta. */
async function register(page: Page, buyer: Buyer): Promise<void> {
  await gotoStore(page, '/cuenta/registro')
  const main = page.getByRole('main')
  await main.getByLabel('Nombre').fill(buyer.firstName)
  await main.getByLabel('Apellido').fill(buyer.lastName)
  await main.getByLabel('Email').fill(buyer.email)
  await main.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
  await main.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.waitForURL(/\/cuenta$/)
  await expect(
    page.getByRole('heading', { level: 1, name: `Hola, ${buyer.firstName}` }),
  ).toBeVisible()
}

/** Guarda una dirección predeterminada desde `/cuenta/direcciones`. */
async function addAddress(page: Page): Promise<void> {
  await gotoStore(page, '/cuenta/direcciones')
  const main = page.getByRole('main')
  await main.getByRole('button', { name: 'Agregar dirección' }).first().click()
  await main.getByLabel('Nombre (opcional)').fill('Casa')
  await main.getByLabel('Calle').fill('Av. Rivadavia')
  await main.getByLabel('Número', { exact: true }).fill('4321')
  await main.getByLabel('Código postal').fill('1406')
  await main.getByLabel('Ciudad').fill('Buenos Aires')
  await main.getByLabel('Provincia').selectOption('CABA')
  await main.getByLabel('Usar como dirección predeterminada').check()
  await main.getByRole('button', { name: 'Guardar dirección' }).click()
  await expect(main.getByText('Predeterminada', { exact: true })).toBeVisible()
}

test.describe('tienda: compra con cuenta', () => {
  test.slow()

  test('registro, dirección guardada, compra y el pedido aparece en "Tus pedidos"', async ({
    page,
  }, testInfo) => {
    const buyer = buyerFor(testInfo, 'Martina')
    await register(page, buyer)
    await addAddress(page)

    await addToCart(page, DEFAULT_PRODUCT)
    await gotoStore(page, '/checkout')
    // Con sesión, el contacto se completa solo.
    const contact = stepForm(page, 'Contacto')
    await expect(contact.getByLabel('Email')).toHaveValue(buyer.email)
    await expect(contact.getByLabel('Nombre')).toHaveValue(buyer.firstName)
    await contact.getByRole('button', { name: 'Continuar' }).click()

    const shipping = stepForm(page, 'Envío')
    await shipping.getByLabel('Usar una dirección guardada').selectOption({ index: 1 })
    await expect(shipping.getByLabel('Calle')).toHaveValue('Av. Rivadavia')
    await expect(shipping.getByLabel('Código postal')).toHaveValue('1406')
    await shipping.getByRole('button', { name: 'Continuar' }).click()

    const { number } = await payWithMercadoPago(page)
    await page.getByRole('button', { name: 'Aprobar' }).click()
    await waitForResult(page, number)
    await expect(page.getByRole('heading', { level: 1, name: '¡Gracias, Martina!' })).toBeVisible()

    await gotoStore(page, '/cuenta/pedidos')
    await expect(page.getByRole('heading', { level: 1, name: 'Tus pedidos' })).toBeVisible()
    const order = page.getByRole('link', { name: new RegExp(number) })
    await expect(order).toBeVisible()
    await expect(order).toContainText('Pagado')
  })
})

test.describe('tienda: eliminar la cuenta', () => {
  test.slow()

  test('registro, eliminar la cuenta con la contraseña y ya no se puede ingresar', async ({
    page,
  }, testInfo) => {
    const buyer = buyerFor(testInfo, 'Julieta')
    await register(page, buyer)

    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { level: 2, name: 'Eliminar mi cuenta' })).toBeVisible()
    await main.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Eliminar tu cuenta?' })
    await expect(dialog).toBeVisible()

    // Con la contraseña equivocada el diálogo sigue abierto y avisa bajo el campo.
    await dialog.getByLabel('Contraseña actual').fill('otra-clave-123')
    await dialog.getByRole('button', { name: 'Sí, eliminar mi cuenta' }).click()
    await expect(dialog.getByText('La contraseña no es correcta')).toBeVisible()

    await dialog.getByLabel('Contraseña actual').fill(PASSWORD)
    await dialog.getByRole('button', { name: 'Sí, eliminar mi cuenta' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    await expect(page.getByText('Eliminamos tu cuenta').first()).toBeVisible()

    await gotoStore(page, '/cuenta/ingresar')
    const login = page.getByRole('main')
    await login.getByLabel('Email').fill(buyer.email)
    await login.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await login.getByRole('button', { name: 'Ingresar', exact: true }).click()
    await expect(login.getByText('Email o contraseña incorrectos.')).toBeVisible()
  })
})

test.describe('tienda: accesibilidad de la cuenta (axe)', () => {
  // Con movimiento reducido todo queda en su estado final: axe no mide el contraste de un
  // elemento a medio aparecer.
  test.use({ reducedMotion: 'reduce' })
  test.slow()

  test('ingreso y registro no tienen violaciones serias ni críticas', async ({ page }) => {
    await gotoStore(page, '/cuenta/ingresar')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ingresá a tu cuenta.' }),
    ).toBeVisible()
    expect(await seriousViolations(page), 'Ingresar').toEqual([])

    await gotoStore(page, '/cuenta/registro')
    await expect(page.getByRole('heading', { level: 1, name: 'Creá tu cuenta.' })).toBeVisible()
    expect(await seriousViolations(page), 'Registro').toEqual([])
  })

  test('resumen, direcciones y pedidos no tienen violaciones serias ni críticas', async ({
    page,
  }, testInfo) => {
    await register(page, buyerFor(testInfo, 'Martina'))
    expect(await seriousViolations(page), 'Resumen de la cuenta').toEqual([])

    await page.getByRole('main').getByRole('button', { name: 'Eliminar mi cuenta' }).click()
    await expect(page.getByRole('dialog', { name: '¿Eliminar tu cuenta?' })).toBeVisible()
    expect(await seriousViolations(page), 'Eliminar mi cuenta').toEqual([])
    await page.keyboard.press('Escape')

    await addAddress(page)
    expect(await seriousViolations(page), 'Direcciones').toEqual([])

    await gotoStore(page, '/cuenta/pedidos')
    await expect(page.getByRole('heading', { level: 1, name: 'Tus pedidos' })).toBeVisible()
    expect(await seriousViolations(page), 'Pedidos').toEqual([])
  })
})
