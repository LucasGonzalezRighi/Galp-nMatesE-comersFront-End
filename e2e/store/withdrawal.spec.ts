import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

test.describe('tienda: arrepentimiento', () => {
  test('el título se ve entero: ninguna palabra queda recortada por su columna', async ({
    page,
  }) => {
    await gotoStore(page, '/arrepentimiento')
    const title = page.getByRole('heading', { level: 1, name: 'Botón de arrepentimiento' })
    await expect(title).toBeVisible()

    // `Reveal` recorta con `overflow: hidden`: si una palabra no cabe, el texto sigue en el DOM
    // pero se ve cortado ("arrepentimien"). Ningún elemento del título puede desbordar su caja.
    const overflowing = await title.evaluate(
      (heading: HTMLElement) =>
        [heading, ...Array.from(heading.querySelectorAll<HTMLElement>('*'))].filter(
          (element) => element.scrollWidth > element.clientWidth,
        ).length,
    )
    expect(overflowing).toBe(0)
  })

  test('registra la solicitud sin número de pedido y muestra el código del trámite', async ({
    page,
  }) => {
    await gotoStore(page, '/arrepentimiento')
    await page.getByLabel('Nombre').fill('Lucas')
    await page.getByLabel('Email usado en la compra').fill('lucas@example.com')
    await page.getByRole('button', { name: 'Solicitar arrepentimiento' }).click()

    await expect(page.getByRole('heading', { name: 'Solicitud registrada' })).toBeVisible()
    await expect(page.getByText('Código de identificación', { exact: true })).toBeVisible()
    await expect(page.getByText(/ARR-/)).toBeVisible()
  })

  test('con los campos vacíos marca los errores y no registra nada', async ({ page }) => {
    await gotoStore(page, '/arrepentimiento')
    await page.getByRole('button', { name: 'Solicitar arrepentimiento' }).click()
    await expect(page.getByRole('heading', { name: 'Solicitud registrada' })).toHaveCount(0)
    await expect(page.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true')
  })
})
