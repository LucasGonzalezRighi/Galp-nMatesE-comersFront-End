import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { gotoAdmin, logInAsAdmin, screenHeading, toast } from '../support/admin'
import { expect, test } from '../support/test'

/** Una foto de verdad (960 × 1280 px) de las imágenes de prueba del admin. */
const PHOTO_PATH = 'apps/admin/public/mock-images/mate-imperial-premium.jpg'

/** Un PNG válido de 1 × 1 px: no llega a los 800 px del lado menor. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/** El campo oculto del área de fotos (el botón "Elegir archivos" lo abre). */
function photoInput(page: Page) {
  return page.locator('input[type="file"]')
}

test.describe('dashboard: productos', () => {
  test.beforeEach(async ({ page }) => {
    await logInAsAdmin(page)
  })

  test('crea un producto con dos fotos: reintenta la que falla, rechaza la chica y reordena', async ({
    page,
  }) => {
    await gotoAdmin(page, { path: '/productos/nuevo', heading: 'Nuevo producto' })
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Mate Torpedo de Prueba')
    await expect(page.getByRole('textbox', { name: 'Slug' })).toHaveValue('mate-torpedo-de-prueba')
    await page.getByRole('combobox', { name: 'Línea' }).selectOption({ label: 'Torpedos' })
    await page
      .getByRole('textbox', { name: 'Descripción' })
      .fill('Torpedo de calabaza con virola de alpaca lisa.')
    await page.getByRole('textbox', { name: 'Precio' }).fill('28500')
    await page.getByRole('textbox', { name: 'Stock' }).fill('5')

    const photos = page.getByRole('list', { name: 'Fotos del producto' })
    const uploading = page.getByRole('list', { name: 'Fotos que se están subiendo' })
    const altFields = photos.getByRole('textbox', { name: 'Texto alternativo' })

    // Primera foto: sube bien.
    await photoInput(page).setInputFiles(PHOTO_PATH)
    await expect(altFields).toHaveCount(1)
    await altFields.nth(0).fill('Mate torpedo de frente')

    // Segunda: el nombre empieza con "error-", así que el primer intento falla.
    await photoInput(page).setInputFiles({
      name: 'error-foto.jpg',
      mimeType: 'image/jpeg',
      buffer: readFileSync(PHOTO_PATH),
    })
    await expect(uploading.getByText(/Falló la subida simulada/)).toBeVisible()
    await uploading.getByRole('button', { name: 'Reintentar' }).click()
    await expect(altFields).toHaveCount(2)
    await expect(uploading).toBeHidden()
    await altFields.nth(1).fill('Mate torpedo de costado')

    // Una de 1 × 1 px se rechaza antes de subir, con el motivo.
    await photoInput(page).setInputFiles({
      name: 'punto.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await expect(
      page.getByText(
        'punto.png: La foto tiene que medir al menos 800 px del lado menor (esta mide 1 × 1 px).',
      ),
    ).toBeVisible()
    await expect(altFields).toHaveCount(2)

    // "Mover antes" deja la segunda como principal.
    await photos.getByRole('button', { name: 'Mover la foto 2 antes' }).click()
    await expect(altFields.nth(0)).toHaveValue('Mate torpedo de costado')
    await expect(altFields.nth(1)).toHaveValue('Mate torpedo de frente')

    await page.getByRole('button', { name: 'Crear producto' }).click()
    await expect(toast(page, 'Producto creado.')).toBeVisible()
    await expect(screenHeading(page, 'Mate Torpedo de Prueba')).toBeVisible()
    await expect(altFields).toHaveCount(2)
    await expect(altFields.nth(0)).toHaveValue('Mate torpedo de costado')
    await expect(photos.getByRole('img').first()).toHaveAttribute('src', /^data:image\//)

    await page.reload()
    await expect(
      page.getByRole('list', { name: 'Fotos del producto' }).getByRole('img'),
    ).toHaveCount(2)
  })

  test('cambiar el slug avisa la redirección y deja la dirección anterior', async ({ page }) => {
    await gotoAdmin(page, {
      path: '/productos/prd-imperial-premium',
      heading: 'Mate Imperial Premium',
    })
    await page.getByRole('textbox', { name: 'Slug' }).fill('mate-imperial-premium-alpaca')
    await expect(
      page.getByText(
        'Al guardar, /producto/mate-imperial-premium va a redirigir a /producto/mate-imperial-premium-alpaca.',
      ),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(toast(page, 'Cambios guardados.')).toBeVisible()
    await expect(
      page.getByText('Direcciones anteriores que redirigen: /producto/mate-imperial-premium'),
    ).toBeVisible()
  })

  test('archiva con confirmación, lo muestra en "Archivados" y lo vuelve a publicar', async ({
    page,
  }) => {
    await gotoAdmin(page, { path: '/productos', heading: 'Productos' })
    const table = page.getByRole('table', { name: 'Productos' })
    await page.getByRole('searchbox', { name: 'Buscar' }).fill('Galleta')
    await expect(table.getByRole('row')).toHaveCount(2)

    await page.getByRole('button', { name: 'Acciones de Mate Galleta' }).click()
    await page.getByRole('menuitem', { name: 'Archivar' }).click()
    const confirm = page.getByRole('alertdialog', { name: '¿Archivar «Mate Galleta»?' })
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Archivar' }).click()
    await expect(toast(page, 'Producto archivado.')).toBeVisible()
    await expect(table.getByRole('row', { name: /Mate Galleta/ })).toHaveCount(0)

    await page.getByRole('combobox', { name: 'Estado' }).selectOption({ label: 'Archivados' })
    await expect(page).toHaveURL(/estado=archived/)
    const row = table.getByRole('row', { name: /Mate Galleta/ })
    await expect(row).toContainText('Archivado')

    await row.getByRole('link', { name: 'Mate Galleta' }).click()
    await expect(screenHeading(page, 'Mate Galleta')).toBeVisible()
    await expect(
      page.getByText('Este producto está archivado: no se ve en la tienda.'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Volver a publicar' }).click()
    await expect(toast(page, 'Producto publicado de nuevo.')).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Publicado' })).toBeChecked()
  })
})
