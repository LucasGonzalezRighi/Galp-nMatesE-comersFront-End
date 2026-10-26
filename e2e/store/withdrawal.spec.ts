import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

test.describe('tienda: arrepentimiento', () => {
  test('registra la solicitud sin número de pedido y muestra el código del trámite', async ({
    page,
  }) => {
    await gotoStore(page, '/arrepentimiento')
    await page.getByLabel('Nombre').fill('Lucas')
    await page.getByLabel('Email usado en la compra').fill('lucas@example.com')
    await page.getByRole('button', { name: 'Solicitar arrepentimiento' }).click()

    await expect(page.getByRole('heading', { name: 'Solicitud registrada' })).toBeVisible()
    await expect(page.getByText('Código de identificación', { exact: true })).toBeVisible()
    await expect(page.getByText(/ARR-/)).toBeVisible()
  })

  test('con los campos vacíos marca los errores y no registra nada', async ({ page }) => {
    await gotoStore(page, '/arrepentimiento')
    await page.getByRole('button', { name: 'Solicitar arrepentimiento' }).click()
    await expect(page.getByRole('heading', { name: 'Solicitud registrada' })).toHaveCount(0)
    await expect(page.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true')
  })
})
