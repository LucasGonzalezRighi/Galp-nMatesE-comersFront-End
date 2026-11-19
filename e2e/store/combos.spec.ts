import type { Locator, Page } from '@playwright/test'
import {
  buyerFor,
  changeMockProduct,
  fillContact,
  fillShipping,
  payWithMercadoPago,
  waitForResult,
} from '../support/checkout'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

// Agrega desde el inicio, recarga y compra: recorre el checkout entero.
test.slow()

/** Stock de sobra para las piezas del combo: los dos proyectos compran en paralelo. */
const PLENTY_OF_STOCK = 999

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

test.describe('tienda: combos (Ruling IC-12)', () => {
  test('el inicio muestra los combos entre las líneas y los destacados', async ({ page }) => {
    await gotoStore(page, '/')
    const combos = page.getByRole('region', { name: 'Combos' })
    await combos.scrollIntoViewIfNeeded()
    await expect(
      combos.getByRole('heading', { level: 2, name: 'Combos listos para cebar' }),
    ).toBeVisible()
    await expect(combos.getByRole('article')).toHaveCount(4)
    // Los títulos son contenido (Ruling AT-4).
    const collection = page.getByRole('heading', { level: 2, name: 'Categorías', exact: true })
    const featured = page.getByRole('heading', { level: 2, name: 'Los más vendidos', exact: true })
    const top = async (locator: Locator): Promise<number> =>
      await locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
    const [collectionTop, combosTop, featuredTop] = await Promise.all([
      top(collection),
      top(combos),
      top(featured),
    ])
    expect(collectionTop).toBeLessThan(combosTop)
    expect(combosTop).toBeLessThan(featuredTop)
  })

  test('agrega "Dúo Imperial" con cuero Marrón, lo ve en el carrito, recarga y lo compra', async ({
    page,
  }, testInfo) => {
    await changeMockProduct(page.request, 'prd-imperial-premium', { stock: PLENTY_OF_STOCK })
    await changeMockProduct(page.request, 'prd-bombillon-premium-curvo', {
      stock: PLENTY_OF_STOCK,
    })
    await gotoStore(page, '/')

    const card = page
      .getByRole('region', { name: 'Combos' })
      .getByRole('article', { name: 'Dúo Imperial' })
    await card.scrollIntoViewIfNeeded()
    await card.getByRole('button', { name: 'Marrón' }).click()
    await expect(card.getByRole('button', { name: 'Marrón' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // Sin virola (Ruling AT-5): el mate del combo solo elige el cuero.
    await expect(card.getByRole('radio')).toHaveCount(0)
    await card.getByRole('button', { name: 'Agregar combo Dúo Imperial al carrito' }).click()
    await expect(page.getByText('Combo agregado al carrito. Dúo Imperial')).toBeAttached()
    await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 1 producto')
    // No abre el carrito: solo el aviso y el vuelo.
    await expect(page.getByRole('dialog', { name: /^Carrito/ })).toBeHidden()

    const pieces = 'Mate Imperial Premium + Bombillón Premium Curvo · Color marrón'
    let drawer = await openCart(page)
    await expect(drawer.getByText('Dúo Imperial')).toBeVisible()
    await expect(drawer.getByText(pieces)).toBeVisible()
    await expect(drawer.getByText('Ahorrás $6.999')).toBeVisible()
    await expect(drawer.getByText('Ahorro', { exact: true })).toBeVisible()
    await expect(drawer.getByText('−$6.999')).toBeVisible()
    await expect(drawer.getByText('$61.999')).toHaveCount(2)

    // La línea del combo sobrevive a recargar (Review Focus 4).
    await gotoStore(page, '/tienda')
    await page.reload()
    await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 1 producto')
    drawer = await openCart(page)
    await expect(drawer.getByText(pieces)).toBeVisible()

    await gotoStore(page, '/checkout')
    await fillContact(page, buyerFor(testInfo))
    await fillShipping(page, 'Retiro en persona')
    const { number } = await payWithMercadoPago(page)
    await page.getByRole('button', { name: 'Aprobar' }).click()
    await waitForResult(page, number)
    await expect(page.getByText(`Tu pedido ${number} está confirmado.`)).toBeVisible()
    await expect(page.getByText('Dúo Imperial')).toBeVisible()
    // El resultado muestra el detalle del pedido: las piezas y el cuero.
    await expect(page.getByText(pieces, { exact: true })).toBeVisible()
    await expect(page.getByText('Ahorrás $6.999')).toBeVisible()
  })
})
