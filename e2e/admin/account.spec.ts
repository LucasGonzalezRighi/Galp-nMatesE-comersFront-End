import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  gotoAdmin,
  logIn,
  logInAsAdmin,
  screenHeading,
  toast,
} from '../support/admin'
import { expect, test } from '../support/test'

/** La contraseña nueva: 10 caracteres o más, con letras y números. */
const NEW_PASSWORD = 'mate-amargo-2027'

test.describe('dashboard: mi cuenta', () => {
  test('cambia la contraseña, cierra sesión y entra con la nueva', async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/cuenta', heading: 'Mi cuenta' })
    await page.getByRole('textbox', { name: 'Contraseña actual' }).fill(ADMIN_PASSWORD)
    await page.getByRole('textbox', { name: 'Contraseña nueva', exact: true }).fill(NEW_PASSWORD)
    await page.getByRole('textbox', { name: 'Repetí la contraseña nueva' }).fill(NEW_PASSWORD)
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await expect(toast(page, 'Contraseña cambiada.')).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login/)
    await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos')

    await logIn(page, ADMIN_EMAIL, NEW_PASSWORD)
    await expect(screenHeading(page, 'Resumen')).toBeVisible()
  })
})
