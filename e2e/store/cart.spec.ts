import type { Locator, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Botón del encabezado que abre el carrito (su nombre dice cuántos productos hay). */
function cartButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Abrir carrito/ })
}

/** Abre el carrito desde el encabezado y devuelve el panel. */
async function openCart(page: Page): Promise<Locator> {
  await cartButton(page).click()
  const drawer = page.getByRole('dialog', { name: /^Carrito/ })
  await expect(drawer).toBeVisible()
  return drawer
}

test.describe('tienda: carrito', () => {
  test('agrega un producto desde la tarjeta del catálogo y lo muestra en el carrito', async ({
    page,
  }) => {
    await gotoStore(page, '/tienda')
    await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 0 productos')
    await page
      .getByRole('button', { name: /^Agregar .+ al carrito$/ })
      .first()
      .click()
    await expect(page.getByText('Agregado al carrito. Mate Imperial Premium')).toBeAttached()
    await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 1 producto')

    const drawer = await openCart(page)
    await expect(drawer.getByText('Mate Imperial Premium')).toBeVisible()
    await expect(drawer.getByText('Subtotal')).toBeVisible()
    await expect(drawer.getByText('$39.999').first()).toBeVisible()
    await expect(drawer.getByRole('link', { name: 'Finalizar compra' })).toHaveAttribute(
      'href',
      '/checkout',
    )
  })

  test('agrega con la cantidad elegida desde la ficha y el carrito la recuerda al recargar', async ({
    page,
  }) => {
    await gotoStore(page, '/producto/mate-imperial-premium')
    const purchase = page.getByRole('main')
    await purchase.getByRole('button', { name: 'Sumar' }).first().click()
    await purchase.getByRole('button', { name: 'Agregar al carrito' }).first().click()
    await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 2 productos')

    await page.reload()
    await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 2 productos')
    const drawer = await openCart(page)
    await expect(drawer.getByText('Mate Imperial Premium')).toBeVisible()
    await expect(drawer.getByText('$79.998').first()).toBeVisible()
  })

  test('el doble clic en "Agregar al carrito" suma dos unidades', async ({ page }) => {
    await gotoStore(page, '/producto/mate-imperial-premium')
    await page
      .getByRole('main')
      .getByRole('button', { name: 'Agregar al carrito' })
      .first()
      .dblclick()
    await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 2 productos')
  })

  test('al llegar al máximo disponible el botón se bloquea y el carrito deja de sumar', async ({
    page,
  }) => {
    await gotoStore(page, '/producto/mate-imperial-premium')
    const add = page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).first()
    // Sin tope conocido en pantalla, se agrega hasta que el botón se bloquea (con un límite de seguridad).
    for (let clicks = 0; clicks < 50 && (await add.isEnabled()); clicks += 1) {
      await add.click()
    }
    await expect(add).toBeDisabled()
    const label = await cartButton(page).getAttribute('aria-label')
    const drawer = await openCart(page)
    await expect(drawer.getByRole('button', { name: 'Sumar' }).first()).toBeDisabled()
    await drawer.getByRole('button', { name: 'Cerrar carrito' }).first().click()
    await expect(cartButton(page)).toHaveAttribute('aria-label', label ?? '')
  })

  test('el botón "Agregar kit al carrito" ocupa todo el ancho de la tarjeta del resumen', async ({
    page,
  }) => {
    await gotoStore(page, '/kit')
    const summary = page.getByRole('complementary', { name: 'Resumen del kit' })
    const addKit = summary.getByRole('button', { name: 'Agregar kit al carrito' })
    await expect(addKit).toBeVisible()

    // El imán (`Magnetic`) rodea al botón con un margen negativo: el botón tiene que medir lo mismo
    // que el interior de la tarjeta (su ancho menos el relleno y el borde), no lo que mide su texto.
    const { button, inner } = await addKit.evaluate((element: HTMLElement) => {
      const card = element.closest('aside')
      if (card === null) throw new Error('Falta la tarjeta del resumen.')
      const style = getComputedStyle(card)
      const edges = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'] as const
      const spacing = edges.reduce((total, edge) => total + parseFloat(style[edge]), 0)
      return {
        button: element.getBoundingClientRect().width,
        inner: card.getBoundingClientRect().width - spacing,
      }
    })
    expect(Math.abs(button - inner)).toBeLessThan(1)
  })

  test('arma un kit paso a paso y lo ve en el carrito con el mismo total', async ({ page }) => {
    await gotoStore(page, '/kit')
    await page.getByRole('button', { name: /^Imperiales Mate Imperial Premium/ }).click()
    await page
      .getByRole('button', { name: /^Bombillones / })
      .first()
      .click()
    await page
      .getByRole('button', { name: /^Yerbas / })
      .first()
      .click()

    const summary = page.getByRole('complementary', { name: 'Resumen del kit' })
    const addKit = summary.getByRole('button', { name: 'Agregar kit al carrito' })
    await expect(addKit).toBeEnabled()
    // Con las tres piezas, el descuento del kit como siempre (Ruling AI-6).
    await expect(summary.getByText('Descuento kit −10%')).toBeVisible()
    await expect(summary.getByText(/^Sumá/)).toHaveCount(0)
    const total = await summary
      .getByText('Total', { exact: true })
      .locator('xpath=following-sibling::*[1]')
      .innerText()
    expect(total).toMatch(/^\$[\d.]+$/)

    await addKit.click()
    await expect(page.getByText('Kit agregado al carrito', { exact: true })).toBeAttached()
    const drawer = await openCart(page)
    await expect(drawer.getByText('Kit ronda completa')).toBeVisible()
    await expect(drawer.getByText(/^Ahorrás/)).toBeVisible()
    await expect(drawer.getByText(total).first()).toBeVisible()
  })

  test('con mate y yerba agrega dos productos sueltos a precio de lista, sin "Descuento kit"', async ({
    page,
  }) => {
    await gotoStore(page, '/kit')
    await page.getByRole('button', { name: /^Imperiales Mate Imperial Premium/ }).click()
    await page
      .getByRole('navigation', { name: 'Pasos del kit' })
      .getByRole('button', { name: /^Yerba/ })
      .click()
    await page.getByRole('button', { name: /^Yerbas Yerba Canarias 1 kg/ }).click()

    // 39.999 + 9.999 a precio de lista: el resumen no muestra un descuento que el carrito no cobra.
    const summary = page.getByRole('complementary', { name: 'Resumen del kit' })
    await expect(summary.getByText(/Descuento kit/)).toHaveCount(0)
    await expect(
      summary.getByText('Total', { exact: true }).locator('xpath=following-sibling::*[1]'),
    ).toHaveText('$49.998')
    await expect(summary.getByText('Sumá la bombilla y tenés −10%.')).toBeVisible()
    await expect(summary.getByRole('button', { name: 'Agregar kit al carrito' })).toHaveCount(0)
    const add = summary.getByRole('button', { name: 'Agregar al carrito' })
    await expect(add).toBeEnabled()
    await expect(add).toHaveAccessibleDescription('Sumá la bombilla y tenés −10%.')

    await add.click()
    await expect(
      page.getByText('Agregado al carrito. Mate Imperial Premium y Yerba Canarias 1 kg'),
    ).toBeAttached()
    await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 2 productos')
    // Como con el kit, el carrito se abre solo y el kit vuelve al primer paso.
    const drawer = page.getByRole('dialog', { name: /^Carrito/ })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('Mate Imperial Premium')).toBeVisible()
    await expect(drawer.getByText('Yerba Canarias 1 kg')).toBeVisible()
    await expect(drawer.getByText('Kit ronda completa')).toHaveCount(0)
    await expect(drawer.getByText(/^Ahorrás/)).toHaveCount(0)
    await expect(drawer.getByText('$39.999').first()).toBeVisible()
    await expect(drawer.getByText('$9.999').first()).toBeVisible()
    await expect(drawer.getByText('$49.998').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Elegí el mate' })).toBeAttached()
  })
})
