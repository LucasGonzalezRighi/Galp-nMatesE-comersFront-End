import { gotoAdmin, logInAsAdmin, toast } from '../support/admin'
import { expect, test } from '../support/test'

test.describe('dashboard: líneas', () => {
  test.beforeEach(async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/lineas', heading: 'Líneas' })
  })

  test('crea una línea y la sube un lugar', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva línea' }).click()
    const dialog = page.getByRole('dialog', { name: 'Nueva línea' })
    await dialog.getByRole('textbox', { name: 'Nombre' }).fill('Calabazas')
    await expect(dialog.getByRole('textbox', { name: 'Slug' })).toHaveValue('calabazas')
    await dialog.getByRole('textbox', { name: 'Bajada' }).fill('Mates de calabaza curados a mano.')
    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(dialog).toBeHidden()
    await expect(toast(page, 'Línea creada.')).toBeVisible()

    const list = page.getByRole('list', { name: 'Líneas' })
    await expect(list.getByRole('listitem').last()).toContainText('Calabazas')
    await page.getByRole('button', { name: 'Subir Calabazas' }).click()
    await expect(toast(page, 'Orden guardado.')).toBeVisible()
    await expect(list.getByRole('listitem').last()).toContainText('Yerbas')
    await expect(list.getByRole('listitem').nth(-2)).toContainText('Calabazas')
  })

  test('no deja borrar una línea con productos', async ({ page }) => {
    await page.getByRole('button', { name: 'Acciones de Imperiales' }).click()
    await page.getByRole('menuitem', { name: 'Borrar' }).click()
    const confirm = page.getByRole('alertdialog', { name: '¿Borrar la línea «Imperiales»?' })
    await confirm.getByRole('button', { name: 'Borrar' }).click()
    await expect(confirm.getByRole('alert')).toHaveText(
      'La línea tiene productos. Movelos a otra línea antes de borrarla.',
    )
  })
})
