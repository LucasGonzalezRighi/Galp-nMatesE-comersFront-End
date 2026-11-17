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
    await expect(toast(page, 'Ajustes guardados.')).toHaveCount(0)
  })

  test('la alícuota de IVA con coma decimal se guarda', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Alícuota de IVA (%)' }).fill('10,5')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Ajustes guardados.')).toBeVisible()

    await page.reload()
    await expect(screenHeading(page, 'Ajustes')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Alícuota de IVA (%)' })).toHaveValue('10,5')
  })

  test('al cargar los 7 datos legales el aviso desaparece de Ajustes y del Resumen', async ({
    page,
  }) => {
    const notice = page.getByRole('note').filter({ hasText: 'Faltan datos legales del vendedor' })
    await expect(notice.getByRole('listitem')).toHaveCount(7)

    await page.getByRole('textbox', { name: 'Razón social o nombre' }).fill('Galpón Mates S. R. L.')
    await page.getByRole('textbox', { name: 'CUIT' }).fill('20-12345678-6')
    await page
      .getByRole('textbox', { name: 'Condición frente al IVA' })
      .fill('Responsable inscripto')
    await page.getByRole('textbox', { name: 'Domicilio legal' }).fill('Av. Corrientes 1234, CABA')
    await page.getByRole('textbox', { name: 'Área responsable' }).fill('Atención al cliente')
    await page
      .getByRole('textbox', { name: 'Horario de atención' })
      .fill('Lunes a viernes de 9 a 18')
    await page
      .getByRole('textbox', { name: 'Data Fiscal (ARCA)' })
      .fill(
        '<a href="https://qr.afip.gob.ar/?qr=abc123" target="_F960AFIPInfo"><img src="https://www.afip.gob.ar/images/f960/DATAWEB.jpg" border="0"></a>',
      )
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Ajustes guardados.')).toBeVisible()
    await expect(notice).toHaveCount(0)
    await expect(page.getByRole('textbox', { name: 'Data Fiscal (ARCA)' })).toHaveValue(
      'https://qr.afip.gob.ar/?qr=abc123',
    )

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Resumen' })
      .click()
    await expect(screenHeading(page, 'Resumen')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Poco stock' })).toBeVisible()
    await expect(page.getByText('Faltan datos legales del vendedor')).toHaveCount(0)
  })

  test('el Resumen avisa los datos que faltan y "Completar en Ajustes" lleva a Ajustes', async ({
    page,
  }) => {
    await gotoAdmin(page, { path: '/', heading: 'Resumen' })
    const notice = page.getByRole('note').filter({ hasText: 'Faltan datos legales del vendedor' })
    await expect(notice.getByRole('listitem')).toHaveCount(7)
    await notice.getByRole('link', { name: 'Completar en Ajustes' }).click()
    await expect(screenHeading(page, 'Ajustes')).toBeVisible()
  })
})
