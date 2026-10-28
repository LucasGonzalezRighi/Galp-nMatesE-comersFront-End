import { gotoAdmin, logInAsAdmin, screenHeading, toast } from '../support/admin'
import { expect, test } from '../support/test'

test.describe('dashboard: ajustes', () => {
  test.beforeEach(async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/ajustes', heading: 'Ajustes' })
  })

  test('un CUIT inválido no se guarda', async ({ page }) => {
    await page.getByRole('textbox', { name: 'CUIT' }).fill('20-12345678-5')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('CUIT inválido', { exact: true })).toBeVisible()
  })

  test('la alícuota de IVA con coma decimal se guarda', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Alícuota de IVA (%)' }).fill('10,5')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Ajustes guardados.')).toBeVisible()

    await page.reload()
    await expect(screenHeading(page, 'Ajustes')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Alícuota de IVA (%)' })).toHaveValue('10,5')
  })
})
