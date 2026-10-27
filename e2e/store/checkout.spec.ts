import type { Request } from '@playwright/test'
import { formatPesos, pesos } from '@galpon/domain'
import {
  addToCart,
  buyerFor,
  changeMockProduct,
  choosePayment,
  currentStep,
  expireMockOrder,
  fillCard,
  fillContact,
  fillShipping,
  DEFAULT_PRODUCT,
  goToPayment,
  payWithCardButton,
  payWithMercadoPago,
  payWithMpButton,
  priceChangeProduct,
  readStoredOrder,
  stepForm,
  TEST_CARD,
  waitForResult,
} from '../support/checkout'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

// Cada compra recorre tres pasos, crea un pedido y paga: más lento que las demás pruebas.
test.slow()

test.describe('tienda: compra de invitado con Mercado Pago', () => {
  test('aprobado: muestra el agradecimiento con el número de pedido', async ({
    page,
  }, testInfo) => {
    const buyer = buyerFor(testInfo)
    await goToPayment(page, buyer, { shipping: 'Envío a domicilio' })
    const { number } = await payWithMercadoPago(page)
    await page.getByRole('button', { name: 'Aprobar' }).click()
    await waitForResult(page, number)
    await expect(page.getByRole('heading', { level: 1, name: '¡Gracias, Lucía!' })).toBeVisible()
    await expect(page.getByText(`Tu pedido ${number} está confirmado.`)).toBeVisible()
    await expect(page.getByText('Envío a domicilio').first()).toBeVisible()
  })

  test('pendiente: avisa que espera la confirmación del pago', async ({ page }, testInfo) => {
    await goToPayment(page, buyerFor(testInfo))
    const { number } = await payWithMercadoPago(page)
    await page.getByRole('button', { name: 'Dejar pendiente' }).click()
    await waitForResult(page, number)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Estamos esperando la confirmación del pago',
      }),
    ).toBeVisible()
  })

  test('rechazado: ofrece probar con otro medio y vuelve al paso 3', async ({ page }, testInfo) => {
    await goToPayment(page, buyerFor(testInfo))
    const { number } = await payWithMercadoPago(page)
    await page.getByRole('button', { name: 'Rechazar' }).click()
    await waitForResult(page, number)
    await expect(
      page.getByRole('heading', { level: 1, name: 'El pago no se aprobó' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Probar con otro medio' }).click()
    await page.waitForURL(/\/checkout$/)
    await expect(currentStep(page)).toContainText('Pago')
  })
})

test.describe('tienda: compra de invitado con tarjeta', () => {
  test('titular APRO: aprueba y muestra la tarjeta usada', async ({ page }, testInfo) => {
    await goToPayment(page, buyerFor(testInfo))
    await fillCard(page, 'APRO')
    await payWithCardButton(page).click()
    const { number } = await readStoredOrder(page)
    await waitForResult(page, number)
    await expect(page.getByRole('heading', { level: 1, name: '¡Gracias, Lucía!' })).toBeVisible()
    await expect(page.getByText(`Tarjeta terminada en ${TEST_CARD.lastFour}`)).toBeVisible()
  })

  test('titular OTHE: rechaza con el motivo', async ({ page }, testInfo) => {
    await goToPayment(page, buyerFor(testInfo))
    await fillCard(page, 'OTHE')
    await payWithCardButton(page).click()
    const { number } = await readStoredOrder(page)
    await waitForResult(page, number)
    await expect(
      page.getByRole('heading', { level: 1, name: 'El pago no se aprobó' }),
    ).toBeVisible()
    await expect(page.getByText('La tarjeta no aprobó el pago.')).toBeVisible()
  })

  test('titular 3DS: pide verificar con el banco y, al confirmar, aprueba', async ({
    page,
  }, testInfo) => {
    await goToPayment(page, buyerFor(testInfo))
    await fillCard(page, '3DS')
    await payWithCardButton(page).click()
    const dialog = page.getByRole('dialog', { name: 'Verificá tu compra con tu banco' })
    await expect(dialog).toBeVisible()
    const challenge = dialog.frameLocator('iframe[title="Verificación de tu banco"]')
    // El simulador usa el layout pelado: dentro del iframe no están la barra de arrepentimiento,
    // el carrito ni el pie de la tienda (el simulador tiene su propio encabezado, como MP).
    await expect(challenge.getByRole('button', { name: 'Confirmar' })).toBeVisible()
    await expect(challenge.getByRole('link', { name: 'Botón de arrepentimiento' })).toHaveCount(0)
    await expect(challenge.getByRole('button', { name: /^Abrir carrito/ })).toHaveCount(0)
    await expect(challenge.getByRole('contentinfo')).toHaveCount(0)
    await challenge.getByRole('button', { name: 'Confirmar' }).click()
    // El simulador avisa por postMessage que terminó: el diálogo se cierra solo.
    await expect(dialog).toBeHidden()
    const { number } = await readStoredOrder(page)
    await waitForResult(page, number)
    await expect(page.getByRole('heading', { level: 1, name: '¡Gracias, Lucía!' })).toBeVisible()
  })

  test('doble clic en "Pagar": un solo pedido y un solo pago', async ({ page }, testInfo) => {
    const orders: Request[] = []
    const payments: Request[] = []
    page.on('request', (request) => {
      if (request.method() !== 'POST') return
      const { pathname } = new URL(request.url())
      if (pathname === '/api/v1/orders') orders.push(request)
      if (pathname.endsWith('/payments/mercadopago/card')) payments.push(request)
    })
    await goToPayment(page, buyerFor(testInfo))
    await fillCard(page, 'APRO')
    await payWithCardButton(page).dblclick()
    const { number } = await readStoredOrder(page)
    await waitForResult(page, number)
    await expect(page.getByRole('heading', { level: 1, name: '¡Gracias, Lucía!' })).toBeVisible()
    expect(orders).toHaveLength(1)
    expect(payments).toHaveLength(1)
    expect(await payments[0]?.headerValue('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/)
  })
})

test.describe('tienda: el pedido cambia o vence', () => {
  test('si el precio cambió antes de confirmar, muestra el cambio y no cobra hasta confirmar de nuevo', async ({
    page,
  }, testInfo) => {
    const product = priceChangeProduct(testInfo)
    const newPrice = product.priceArs + 2000
    try {
      await goToPayment(page, buyerFor(testInfo), { product })
      await changeMockProduct(page.request, product.id, { priceArs: newPrice })
      await choosePayment(page, 'Mercado Pago')

      const alert = page.getByRole('alert').filter({ hasText: 'Algo cambió en tu carrito' })
      await expect(alert).toBeVisible()
      await expect(alert.getByRole('listitem').first()).toBeVisible()
      await expect(payWithMpButton(page)).toHaveCount(0)

      await page.getByRole('button', { name: 'Confirmar de nuevo' }).click()
      const total = formatPesos(pesos(newPrice))
      await expect(
        page.getByRole('button', { name: `Pagar ${total} con Mercado Pago` }),
      ).toBeVisible()
    } finally {
      await changeMockProduct(page.request, product.id, { priceArs: product.priceArs })
    }
  })

  test('si la reserva venció, el resultado dice "El pedido venció" y vuelve al carrito', async ({
    page,
  }, testInfo) => {
    await goToPayment(page, buyerFor(testInfo))
    await choosePayment(page, 'Mercado Pago')
    await expect(payWithMpButton(page)).toBeVisible()
    const { number } = await readStoredOrder(page)
    await expireMockOrder(page.request, number)

    await page.goto(`/checkout/resultado?pedido=${number}`)
    await expect(page.getByRole('heading', { level: 1, name: 'El pedido venció' })).toBeVisible()
    await page.getByRole('button', { name: 'Volver al carrito' }).click()
    await expect(page.getByRole('dialog', { name: /^Carrito/ })).toBeVisible()
  })
})

test.describe('tienda: checkout robusto', () => {
  test('al recargar en el paso 2 sigue en el paso 2 y conserva el contacto', async ({
    page,
  }, testInfo) => {
    const buyer = buyerFor(testInfo)
    await addToCart(page, DEFAULT_PRODUCT)
    await gotoStore(page, '/checkout')
    await fillContact(page, buyer)
    await expect(stepForm(page, 'Envío')).toBeVisible()

    await page.reload()
    await expect(stepForm(page, 'Envío')).toBeVisible()
    await expect(currentStep(page)).toContainText('Envío')

    await page.getByRole('button', { name: 'Volver' }).click()
    await expect(stepForm(page, 'Contacto').getByLabel('Email')).toHaveValue(buyer.email)
    await expect(stepForm(page, 'Contacto').getByLabel('Nombre')).toHaveValue(buyer.firstName)
    await stepForm(page, 'Contacto').getByRole('button', { name: 'Continuar' }).click()
    await fillShipping(page, 'Retiro en persona')
    await expect(currentStep(page)).toContainText('Pago')
  })

  test('/checkout/resultado sin el token de la pestaña dice "No encontramos ese pedido"', async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    const buyer = buyerFor(testInfo)
    await goToPayment(page, buyer)
    await choosePayment(page, 'Mercado Pago')
    await expect(payWithMpButton(page)).toBeVisible()
    const { number } = await readStoredOrder(page)

    // Otra pestaña (otro sessionStorage): tiene el número, pero no el token.
    const other = await browser.newContext({ baseURL })
    const stranger = await other.newPage()
    await stranger.goto(`/checkout/resultado?pedido=${number}`)
    await expect(
      stranger.getByRole('heading', { level: 1, name: 'No encontramos ese pedido' }),
    ).toBeVisible()
    await expect(stranger.getByText(buyer.email)).toHaveCount(0)
    await expect(stranger.getByRole('main').getByText(/\$\d/)).toHaveCount(0)
    await other.close()
  })
})

test.describe('tienda: seguimiento del pedido de invitado', () => {
  test('/pedido/{numero} muestra el pedido pagado con el token de la pestaña', async ({
    page,
  }, testInfo) => {
    await goToPayment(page, buyerFor(testInfo))
    await fillCard(page, 'APRO')
    await payWithCardButton(page).click()
    const { number } = await readStoredOrder(page)
    await waitForResult(page, number)

    // Misma pestaña (mismo sessionStorage): la página lee el número de la dirección y consulta
    // el pedido apenas carga, sin quedarse en "Consultando tu pedido…".
    await gotoStore(page, `/pedido/${number}`)
    await expect(page.getByRole('heading', { level: 1, name: `Pedido ${number}` })).toBeVisible()
    await expect(page.getByText('Consultando tu pedido…')).toHaveCount(0)
  })
})
