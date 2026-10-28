import type { Page } from '@playwright/test'
import { gotoAdmin, logInAsAdmin, screenHeading, toast } from '../support/admin'
import { expect, test } from '../support/test'

/** Abre el detalle de un pedido de los datos de demostración. */
async function gotoOrder(page: Page, number: string): Promise<void> {
  await gotoAdmin(page, { path: `/pedidos/${number}`, heading: `Pedido ${number}` })
}

test.describe('dashboard: pedidos', () => {
  test.beforeEach(async ({ page }) => {
    await logInAsAdmin(page)
  })

  test('GLP-09001 pasa a preparación, se despacha y se entrega', async ({ page }) => {
    await gotoOrder(page, 'GLP-09001')
    await page.getByRole('button', { name: 'Pasar a preparación' }).click()
    await expect(toast(page, 'El pedido pasó a preparación.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pasar a preparación' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Marcar como despachado' }).click()
    const dialog = page.getByRole('dialog', { name: 'Despachar el pedido GLP-09001' })
    await expect(dialog).toBeVisible()
    // Vacío no se manda: los dos campos obligatorios avisan.
    await dialog.getByRole('button', { name: 'Marcar como despachado' }).click()
    await expect(dialog.getByText('Requerido')).toHaveCount(2)
    await dialog.getByRole('textbox', { name: 'Empresa de envío' }).fill('Andreani')
    await dialog.getByRole('textbox', { name: 'Número de seguimiento' }).fill('AND000111')
    await dialog.getByRole('button', { name: 'Marcar como despachado' }).click()
    await expect(dialog).toBeHidden()
    await expect(toast(page, 'Pedido despachado.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Envío' })).toContainText('Andreani · AND000111')

    await page.getByRole('button', { name: 'Marcar como entregado' }).click()
    const confirm = page.getByRole('alertdialog', { name: '¿Marcar GLP-09001 como entregado?' })
    await confirm.getByRole('button', { name: 'Marcar como entregado' }).click()
    await expect(toast(page, 'Pedido entregado.')).toBeVisible()
    await expect(page.getByText('No hay acciones para este estado.')).toBeVisible()
  })

  test('cancela GLP-09006 con confirmación', async ({ page }) => {
    await gotoOrder(page, 'GLP-09006')
    await page.getByRole('button', { name: 'Cancelar pedido' }).click()
    const confirm = page.getByRole('alertdialog', { name: '¿Cancelar el pedido GLP-09006?' })
    await expect(
      confirm.getByText(
        'Se libera el stock reservado y el pedido queda cancelado. No se puede deshacer.',
      ),
    ).toBeVisible()
    await confirm.getByRole('button', { name: 'Cancelar pedido' }).click()
    await expect(toast(page, 'Pedido cancelado.')).toBeVisible()
    await expect(page.getByText('No hay acciones para este estado.')).toBeVisible()
  })

  test('GLP-09007 no ofrece cancelar porque tiene un pago en curso', async ({ page }) => {
    await gotoOrder(page, 'GLP-09007')
    await expect(
      page.getByText('Hay un pago en curso: esperá a que se resuelva para cancelarlo.'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0)
  })

  test('"Ver pedidos" del resumen filtra los que hay que despachar', async ({ page }) => {
    await page
      .getByRole('region', { name: 'Para despachar' })
      .getByRole('link', { name: 'Ver pedidos' })
      .click()
    await expect(screenHeading(page, 'Pedidos')).toBeVisible()
    await expect(page).toHaveURL(/\/pedidos\?estado=para-despachar$/)
    await expect(page.getByRole('combobox', { name: 'Estado del pedido' })).toHaveValue(
      'para-despachar',
    )
    const rows = page.getByRole('table', { name: 'Pedidos' }).getByRole('row')
    // El encabezado y los tres pedidos pagados o en preparación.
    await expect(rows).toHaveCount(4)
  })

  test('buscar por email filtra la tabla sin poner el email en la URL', async ({ page }) => {
    await gotoAdmin(page, { path: '/pedidos', heading: 'Pedidos' })
    const rows = page.getByRole('table', { name: 'Pedidos' }).getByRole('row')
    await page.getByRole('searchbox', { name: 'Buscar' }).fill('lucia.perez@example.com')
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(1)).toContainText('GLP-09001')
    expect(new URL(page.url()).search).toBe('')
  })
})
