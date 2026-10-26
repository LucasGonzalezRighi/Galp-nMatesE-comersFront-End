import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

test.describe('tienda: reseñas', () => {
  test('envía una reseña y avisa que se publica cuando la revisen', async ({ page }) => {
    await gotoStore(page, '/producto/mate-imperial-premium')
    await page.getByRole('button', { name: 'Escribir una reseña' }).click()
    await expect(
      page.getByRole('heading', { name: 'Tu reseña de Mate Imperial Premium' }),
    ).toBeVisible()

    await page.getByRole('radio', { name: '5 estrellas' }).check({ force: true })
    await page.getByLabel('Nombre').fill('Valentina G.')
    await page
      .getByLabel('Reseña', { exact: true })
      .fill('Llegó rápido y la terminación es hermosa.')
    await page.getByRole('button', { name: 'Publicar reseña' }).click()

    await expect(page.getByText('Gracias, tu reseña se publica cuando la revisemos')).toBeVisible()
    // Queda pendiente de aprobación: todavía no aparece en la lista pública.
    await expect(page.getByText('Llegó rápido y la terminación es hermosa.')).toHaveCount(0)
  })

  test('sin puntuación ni texto marca los campos y no envía', async ({ page }) => {
    await gotoStore(page, '/producto/mate-imperial-premium')
    await page.getByRole('button', { name: 'Escribir una reseña' }).click()
    await page.getByRole('button', { name: 'Publicar reseña' }).click()
    await expect(page.getByText('Gracias, tu reseña se publica cuando la revisemos')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Publicar reseña' })).toBeVisible()
  })
})
