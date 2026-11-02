import type { Locator, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Abre el buscador desde el encabezado y devuelve su campo. */
async function openSearch(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const field = page.getByRole('dialog', { name: 'Buscar' }).getByRole('searchbox')
  await expect(field).toBeFocused()
  return field
}

test.describe('tienda: búsqueda', () => {
  test('Enter con varios resultados lleva a la tienda con la búsqueda', async ({ page }) => {
    await gotoStore(page, '/')
    const field = await openSearch(page)
    await field.fill('torpedo')
    await field.press('Enter')
    await expect(page).toHaveURL('/tienda?q=torpedo')
    await expect(page.getByRole('heading', { level: 1, name: 'Todo el catálogo' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mate Torpedo Premium' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mate Imperial Premium' })).toHaveCount(0)
  })

  test('Enter con un solo resultado abre la ficha del producto', async ({ page }) => {
    await gotoStore(page, '/')
    const field = await openSearch(page)
    await field.fill('te y jengibre')
    // Enter decide con el catálogo ya cargado: se espera a ver el resultado.
    await expect(
      page.getByRole('dialog').getByRole('link', { name: /Té y Jengibre/ }),
    ).toBeVisible()
    await field.press('Enter')
    await expect(page).toHaveURL('/producto/yerba-canarias-te-y-jengibre-1-kg')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Yerba Canarias Té y Jengibre 1 kg' }),
    ).toBeVisible()
  })

  test('encuentra sin importar acentos ni mayúsculas', async ({ page }) => {
    await gotoStore(page, '/')
    const field = await openSearch(page)
    await field.fill('BOMBILLON')
    await expect(
      page
        .getByRole('dialog')
        .getByRole('link', { name: /Bombillón/ })
        .first(),
    ).toBeVisible()
  })

  test('sin resultados avisa en el buscador y en la tienda', async ({ page }) => {
    await gotoStore(page, '/')
    const field = await openSearch(page)
    await field.fill('xyzzy')
    await expect(page.getByText('Sin resultados para “xyzzy”.')).toBeVisible()
    await field.press('Enter')
    await expect(page).toHaveURL('/tienda?q=xyzzy')
    await expect(page.getByText('No encontramos resultados para “xyzzy”.')).toBeVisible()
  })

  test('un texto raro se muestra como texto y la dirección se codifica', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message())
      void dialog.dismiss()
    })
    const weird = '<script>alert(1)</script> \u{1F9C9}'
    await gotoStore(page, '/')
    const field = await openSearch(page)
    await field.fill(weird)
    await field.press('Enter')
    await expect(page).toHaveURL(`/tienda?q=${encodeURIComponent(weird)}`)
    await expect(page.getByText(`No encontramos resultados para “${weird}”.`)).toBeVisible()
    expect(dialogs).toEqual([])
  })

  test('la barra "/" abre el buscador y Escape lo cierra', async ({ page, isMobile }) => {
    test.skip(isMobile, 'El atajo de teclado es de escritorio.')
    await gotoStore(page, '/tienda')
    await page.keyboard.press('/')
    await expect(page.getByRole('dialog', { name: 'Buscar' }).getByRole('searchbox')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Buscar' })).toBeHidden()
  })
})
