import { gotoAdmin, logInAsAdmin, navLink } from '../support/admin'
import { expect, test } from '../support/test'

test.describe('dashboard: mensajes', () => {
  test('"Solo sin leer" filtra y abrir uno baja el contador del menú de 3 a 2', async ({
    page,
  }) => {
    await logInAsAdmin(page)
    await expect(navLink(page, 'Mensajes, 3 sin leer')).toBeVisible()
    await gotoAdmin(page, { path: '/mensajes', heading: 'Mensajes' })

    // Primero el filtro: si se tildara mientras se guarda "leído" (la API simulada demora
    // 150–400 ms), la lista filtrada podría llegar antes que el guardado.
    const list = page.getByRole('list', { name: 'Mensajes' })
    await expect(list.getByRole('listitem')).toHaveCount(8)
    await page.getByRole('checkbox', { name: 'Solo sin leer' }).check()
    await expect(page).toHaveURL(/sinLeer=1/)
    await expect(list.getByRole('listitem')).toHaveCount(3)
    await expect(list.getByRole('button', { name: /^Sin leer / })).toHaveCount(3)

    const message = list.getByRole('button', { name: /Martín Gómez/ })
    await message.click()
    await expect(message).toHaveAttribute('aria-expanded', 'true')
    await expect(
      page.getByText('Creo que me cobraron dos veces el kit. ¿Lo pueden revisar?'),
    ).toBeVisible()
    await expect(message).not.toHaveAccessibleName(/^Sin leer/)
    await expect(navLink(page, 'Mensajes, 2 sin leer')).toBeVisible()
  })
})
