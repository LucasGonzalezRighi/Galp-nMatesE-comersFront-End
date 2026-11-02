import { ADMIN_PASSWORD, expireSession, logInAsAdmin, screenHeading, toast } from '../support/admin'
import { expect, test } from '../support/test'

test.describe('dashboard: sesión vencida', () => {
  test('vence mientras se edita un producto: re-ingreso sin salir y lo editado se guarda', async ({
    page,
  }) => {
    await page.clock.install()
    await logInAsAdmin(page)
    await page.goto('/productos/prd-imperial-premium')
    await expect(screenHeading(page, 'Mate Imperial Premium')).toBeVisible()

    const name = page.getByRole('textbox', { name: 'Nombre' })
    await name.fill('Mate Imperial Premium de cuero')

    const dialog = await expireSession(page)
    await expect(page).toHaveURL(/\/productos\/prd-imperial-premium$/)
    await dialog.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
    await dialog.getByRole('button', { name: 'Ingresar' }).click()
    await expect(dialog).toBeHidden()
    await expect(toast(page, 'Listo, ya podés seguir.')).toBeVisible()

    await expect(name).toHaveValue('Mate Imperial Premium de cuero')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Cambios guardados.')).toBeVisible()
    await expect(screenHeading(page, 'Mate Imperial Premium de cuero')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue(
      'Mate Imperial Premium de cuero',
    )
  })
})
