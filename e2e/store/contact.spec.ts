import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

// El formulario del arrepentimiento también está montado (oculto) en esta página: por eso se usan
// consultas por rol, que ignoran lo oculto.
test.describe('tienda: contacto', () => {
  test('envía el mensaje y muestra la confirmación con el nombre y el email', async ({ page }) => {
    await gotoStore(page, '/contacto')
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Lucas')
    await page.getByRole('textbox', { name: 'Email' }).fill('lucas@example.com')
    await page.getByRole('radiogroup', { name: 'Motivo' }).getByText('Envío').click()
    await page.getByRole('textbox', { name: 'Mensaje' }).fill('Quería saber cuándo sale mi pedido.')
    await page.getByRole('button', { name: 'Enviar mensaje' }).click()

    await expect(page.getByRole('heading', { name: 'Mensaje enviado' })).toBeFocused()
    await expect(
      page.getByText('Gracias, Lucas. Te respondemos a lucas@example.com.'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Escribir otro mensaje' }).click()
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('')
  })

  test('con los campos vacíos marca los errores y no envía', async ({ page }) => {
    await gotoStore(page, '/contacto')
    await page.getByRole('button', { name: 'Enviar mensaje' }).click()
    await expect(page.getByRole('heading', { name: 'Mensaje enviado' })).toHaveCount(0)
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
