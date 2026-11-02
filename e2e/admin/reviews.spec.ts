import { gotoAdmin, logInAsAdmin, navLink, toast } from '../support/admin'
import { expect, test } from '../support/test'

test.describe('dashboard: reseñas', () => {
  test('aprueba una pendiente, la destaca y el contador del menú baja de 4 a 3', async ({
    page,
  }) => {
    await logInAsAdmin(page)
    await expect(navLink(page, 'Reseñas, 4 pendientes')).toBeVisible()
    await gotoAdmin(page, { path: '/resenas', heading: 'Reseñas' })

    await page
      .getByRole('tabpanel', { name: /^Pendientes/ })
      .getByRole('listitem')
      .filter({ hasText: 'Rocío V.' })
      .getByRole('button', { name: 'Aprobar' })
      .click()
    await expect(toast(page, 'Reseña aprobada.')).toBeVisible()
    await expect(navLink(page, 'Reseñas, 3 pendientes')).toBeVisible()

    await page.getByRole('tab', { name: 'Aprobadas' }).click()
    const card = page
      .getByRole('tabpanel', { name: 'Aprobadas' })
      .getByRole('listitem')
      .filter({ hasText: 'Rocío V.' })
    await card.getByRole('button', { name: 'Destacar en el inicio' }).click()
    await expect(toast(page, 'Reseña destacada en el inicio.')).toBeVisible()
    await expect(card.getByText('Destacada', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Quitar de destacadas' })).toBeVisible()
  })
})
