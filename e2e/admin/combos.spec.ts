import type { Locator, Page } from '@playwright/test'
import { gotoAdmin, logInAsAdmin, toast } from '../support/admin'
import { seriousViolations } from '../support/axe'
import { expect, test } from '../support/test'

/** Nombres de los combos en el orden en que se ven (sale de la agarradera de cada uno). */
async function shownOrder(page: Page): Promise<string[]> {
  const handles = page
    .getByRole('list', { name: 'Combos' })
    .getByRole('button', { name: /^Arrastrar / })
  const labels = await handles.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label') ?? ''),
  )
  return labels.map((label) => label.replace(/^Arrastrar /, ''))
}

/** Abre "Nuevo combo" y espera a que las listas de piezas tengan los productos. */
async function openNewCombo(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Nuevo combo' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nuevo combo' })
  await expect(
    dialog.getByRole('option', { name: 'Mate Imperial Premium · $39.999' }),
  ).toBeAttached()
  return dialog
}

/** Elige el Mate Imperial Premium y la Yerba Canarias (suman $49.998). */
async function chooseImperialAndCanarias(dialog: Locator): Promise<void> {
  await dialog
    .getByRole('combobox', { name: 'Mate' })
    .selectOption({ label: 'Mate Imperial Premium · $39.999' })
  await dialog
    .getByRole('combobox', { name: 'Yerba' })
    .selectOption({ label: 'Yerba Canarias 1 kg · $9.999' })
}

// Con movimiento reducido los diálogos quedan en su estado final (axe y las capturas).
test.use({ reducedMotion: 'reduce' })

test.describe('dashboard: combos', () => {
  test.beforeEach(async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/combos', heading: 'Combos' })
  })

  test('"Combos" está en el menú después de "Líneas"', async ({ page }) => {
    const links = page.getByRole('navigation', { name: 'Principal' }).getByRole('link')
    const names = await links.allTextContents()
    expect(names.findIndex((name) => name.includes('Combos'))).toBe(
      names.findIndex((name) => name.includes('Líneas')) + 1,
    )
  })

  test('crea un combo, lo publica y lo sube un lugar', async ({ page }) => {
    const dialog = await openNewCombo(page)
    await dialog.getByRole('textbox', { name: 'Nombre' }).fill('Imperial y Canarias')
    await chooseImperialAndCanarias(dialog)
    await dialog.getByRole('textbox', { name: 'Precio final' }).fill('44999')
    await expect(dialog.getByText('Suma de las piezas $49.998 · Ahorro $4.999')).toBeVisible()
    await dialog.getByText('Publicado', { exact: true }).click()
    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(dialog).toBeHidden()
    await expect(toast(page, 'Combo creado.')).toBeVisible()

    const list = page.getByRole('list', { name: 'Combos' })
    await expect(list.getByRole('listitem').last()).toContainText('Imperial y Canarias')
    await expect(list.getByRole('listitem').last()).toContainText('Publicado')
    await page.getByRole('button', { name: 'Subir Imperial y Canarias' }).click()
    await expect(toast(page, 'Orden guardado.')).toBeVisible()
    await expect(list.getByRole('listitem').last()).toContainText('Galleta y Canarias')
    await expect(list.getByRole('listitem').nth(-2)).toContainText('Imperial y Canarias')

    // El orden quedó guardado: sigue igual al volver a cargar la pantalla.
    await gotoAdmin(page, { path: '/combos', heading: 'Combos' })
    expect(await shownOrder(page)).toEqual([
      'Dúo Imperial',
      'Camionero y Canarias',
      'Torpedo completo',
      'Bombilla y yerba',
      'Imperial y Canarias',
      'Galleta y Canarias',
    ])
  })

  test('arrastrar un combo cambia el orden y persiste', async ({ page }) => {
    const handle = page.getByRole('button', { name: 'Arrastrar Camionero y Canarias' })
    const target = page.getByRole('button', { name: 'Arrastrar Dúo Imperial' })
    const from = await handle.boundingBox()
    const to = await target.boundingBox()
    if (from === null || to === null) throw new Error('No se ven las agarraderas.')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2, to.y + 4, { steps: 12 })
    await page.mouse.move(from.x + from.width / 2, to.y + 2, { steps: 4 })
    await page.mouse.up()
    await expect(toast(page, 'Orden guardado.')).toBeVisible()

    await gotoAdmin(page, { path: '/combos', heading: 'Combos' })
    expect((await shownOrder(page)).slice(0, 2)).toEqual(['Camionero y Canarias', 'Dúo Imperial'])
  })

  test('no deja guardar un combo con una sola pieza', async ({ page }) => {
    const dialog = await openNewCombo(page)
    await dialog.getByRole('textbox', { name: 'Nombre' }).fill('Solo un mate')
    await dialog
      .getByRole('combobox', { name: 'Mate' })
      .selectOption({ label: 'Mate Imperial Premium · $39.999' })
    await dialog.getByRole('textbox', { name: 'Precio final' }).fill('35000')
    await dialog.getByRole('button', { name: 'Guardar' }).click()

    await expect(dialog.getByText('Cargá de 2 a 3 productos')).toBeVisible()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await page
      .getByRole('alertdialog', { name: '¿Descartar los cambios?' })
      .getByRole('button', { name: 'Descartar' })
      .click()
    expect(await shownOrder(page)).toHaveLength(5)
  })

  test('el servidor rechaza un precio que no es menor que la suma (422 en el precio)', async ({
    page,
  }) => {
    const dialog = await openNewCombo(page)
    await dialog.getByRole('textbox', { name: 'Nombre' }).fill('Caro')
    await chooseImperialAndCanarias(dialog)
    const price = dialog.getByRole('textbox', { name: 'Precio final' })
    await price.fill('52000')
    await expect(
      dialog.getByText('El precio tiene que ser menor que la suma de las piezas.'),
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'Guardar' }).click()

    await expect(
      dialog.getByText(
        'El precio del combo tiene que ser menor que la suma de los productos ($49.998)',
      ),
    ).toBeVisible()
    await expect(price).toHaveAttribute('aria-invalid', 'true')
    await expect(dialog).toBeVisible()
  })

  test('la pantalla y el diálogo no tienen violaciones serias ni críticas', async ({ page }) => {
    expect(await seriousViolations(page)).toEqual([])
    const dialog = await openNewCombo(page)
    await chooseImperialAndCanarias(dialog)
    expect(await seriousViolations(page)).toEqual([])
  })
})
