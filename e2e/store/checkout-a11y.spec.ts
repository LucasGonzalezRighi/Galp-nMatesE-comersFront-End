import { seriousViolations } from '../support/axe'
import {
  addToCart,
  buyerFor,
  choosePayment,
  DEFAULT_PRODUCT,
  fillContact,
  fillShipping,
  payWithMercadoPago,
  payWithMpButton,
  stepForm,
  waitForResult,
} from '../support/checkout'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

// Con movimiento reducido todo queda en su estado final: axe no mide el contraste de un elemento
// a medio aparecer.
test.use({ reducedMotion: 'reduce' })
test.slow()

test.describe('tienda: accesibilidad del checkout (axe)', () => {
  test('los tres pasos, con Mercado Pago y con tarjeta, no tienen violaciones serias ni críticas', async ({
    page,
  }, testInfo) => {
    await addToCart(page, DEFAULT_PRODUCT)
    await gotoStore(page, '/checkout')
    await expect(stepForm(page, 'Contacto')).toBeVisible()
    expect(await seriousViolations(page), 'Paso 1, Contacto').toEqual([])

    await fillContact(page, buyerFor(testInfo))
    await expect(stepForm(page, 'Envío').getByLabel('Calle')).toBeVisible()
    expect(await seriousViolations(page), 'Paso 2, Envío a domicilio').toEqual([])

    await fillShipping(page, 'Envío a domicilio')
    await choosePayment(page, 'Mercado Pago')
    await expect(payWithMpButton(page)).toBeVisible()
    expect(await seriousViolations(page), 'Paso 3, Mercado Pago').toEqual([])

    await choosePayment(page, 'Tarjeta de crédito o débito')
    await expect(page.getByLabel('Número de tarjeta')).toBeVisible()
    expect(await seriousViolations(page), 'Paso 3, tarjeta').toEqual([])
  })

  test('el simulador de Mercado Pago y el resultado aprobado no tienen violaciones serias ni críticas', async ({
    page,
  }, testInfo) => {
    await addToCart(page, DEFAULT_PRODUCT)
    await gotoStore(page, '/checkout')
    await fillContact(page, buyerFor(testInfo))
    await fillShipping(page, 'Retiro en persona')
    const { number } = await payWithMercadoPago(page)
    expect(await seriousViolations(page), 'Simulador de Mercado Pago').toEqual([])

    await page.getByRole('button', { name: 'Aprobar' }).click()
    await waitForResult(page, number)
    await expect(page.getByRole('heading', { level: 1, name: '¡Gracias, Lucía!' })).toBeVisible()
    expect(await seriousViolations(page), 'Resultado aprobado').toEqual([])
  })
})
