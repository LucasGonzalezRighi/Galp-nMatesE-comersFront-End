import type { Locator, Page } from '@playwright/test'
import type { Leather } from '@galpon/domain'
import {
  buyerFor,
  changeMockProduct,
  fillContact,
  fillShipping,
  payWithMercadoPago,
} from '../support/checkout'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Un mate de las fixtures que ningún otro E2E usa, para cambiarle los cueros sin pisar a nadie. */
interface LeatherMate {
  /** Identificador en la API simulada, para la ruta de control. */
  id: string
  /** Ruta de la ficha. */
  slug: string
  /** Nombre visible. */
  name: string
}

/**
 * Un mate por proyecto (los dos comparten la base del mock de la tienda y corren a la vez):
 * "Mate Imperial Criollo" en la computadora y "Mate Imperial Térmico" en el celular.
 */
const MATES: Readonly<Record<string, LeatherMate>> = {
  'store-desktop': {
    id: 'prd-imperial-criollo',
    slug: 'mate-imperial-criollo',
    name: 'Mate Imperial Criollo',
  },
  'store-mobile': {
    id: 'prd-imperial-termico',
    slug: 'mate-imperial-termico',
    name: 'Mate Imperial Térmico',
  },
}

/** Los cuatro cueros, como los traen los mates de las fixtures. */
const ALL_LEATHERS: Leather[] = ['Negro', 'Marrón', 'Crudo', 'Borravino']

/** Stock de fábrica de las fixtures (`DEFAULT_STOCK`). */
const DEFAULT_STOCK = 12

/** El mate del proyecto que corre. */
function mateFor(projectName: string): LeatherMate {
  const mate = MATES[projectName]
  if (mate === undefined) throw new Error(`No hay un mate para el proyecto ${projectName}.`)
  return mate
}

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

/** El grupo de muestras de cuero de la ficha. */
function leatherSwatches(page: Page): Locator {
  return page.getByRole('main').getByRole('group', { name: 'Color', exact: true })
}

/** "Agregar al carrito" de la compra de la ficha (el primero: los relacionados vienen después). */
function addToCart(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).first()
}

test.describe('tienda: cueros por producto (Ruling AT-5)', () => {
  test.describe.configure({ mode: 'serial' })

  test.afterEach(async ({ request }, testInfo) => {
    await changeMockProduct(request, mateFor(testInfo.project.name).id, {
      leathers: ALL_LEATHERS,
      stock: DEFAULT_STOCK,
    })
  })

  test('un mate con solo Crudo muestra una sola muestra y la línea dice "Color crudo"', async ({
    page,
  }, testInfo) => {
    const mate = mateFor(testInfo.project.name)
    await changeMockProduct(page.request, mate.id, { leathers: ['Crudo'] })
    await gotoStore(page, `/producto/${mate.slug}`)

    const swatches = leatherSwatches(page)
    await expect(swatches.getByRole('button')).toHaveCount(1)
    await expect(swatches.getByRole('button', { name: 'Crudo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await addToCart(page).click()
    await expect(page.getByText(`Agregado al carrito. ${mate.name}`)).toBeAttached()

    const drawer = await openCart(page)
    await expect(drawer.getByText(mate.name)).toBeVisible()
    await expect(drawer.getByText('Color crudo', { exact: true })).toBeVisible()
    // Cotiza sin error y se puede finalizar (la clave de la línea es la que espera la vista).
    await expect(drawer.getByRole('link', { name: 'Finalizar compra' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  test('un mate sin cueros se agrega sin selector y se puede comprar', async ({
    page,
  }, testInfo) => {
    test.slow()
    const mate = mateFor(testInfo.project.name)
    await changeMockProduct(page.request, mate.id, { leathers: [] })
    await gotoStore(page, `/producto/${mate.slug}`)

    await expect(page.getByRole('heading', { level: 1, name: mate.name })).toBeVisible()
    await expect(leatherSwatches(page)).toHaveCount(0)
    await page.getByRole('main').getByRole('button', { name: 'Comprar ahora' }).click()
    await page.waitForURL(/\/checkout$/)

    // El pedido se crea con la línea sin cuero (`options: null`): el mock no pide cuero.
    await fillContact(page, buyerFor(testInfo))
    await fillShipping(page, 'Retiro en persona')
    const { number } = await payWithMercadoPago(page)
    expect(number).toMatch(/^GLP-\d{5}$/)
  })

  test('un cuero que ya no se ofrece pasa al primero que se ofrece y se avisa al recargar', async ({
    page,
  }, testInfo) => {
    const mate = mateFor(testInfo.project.name)
    await gotoStore(page, `/producto/${mate.slug}`)
    await expect(leatherSwatches(page).getByRole('button', { name: 'Negro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await addToCart(page).click()
    await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 1 producto')

    // El admin (o el back) le saca el Negro al mate: el carrito guardado se concilia al recargar.
    await changeMockProduct(page.request, mate.id, { leathers: ['Marrón', 'Crudo'] })
    await page.reload()

    await expect(
      page.getByText(`Actualizamos tu carrito. Cambiamos el color de ${mate.name} a marrón`),
    ).toBeAttached()
    const drawer = await openCart(page)
    await expect(drawer.getByText('Color marrón', { exact: true })).toBeVisible()
    await expect(drawer.getByText('Color negro', { exact: true })).toHaveCount(0)
    // Cotiza sin error y se puede finalizar (la clave de la línea es la que espera la vista).
    await expect(drawer.getByRole('link', { name: 'Finalizar compra' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  test('con stock 0 la ficha dice "Consultar por mail"', async ({ page }, testInfo) => {
    const mate = mateFor(testInfo.project.name)
    await changeMockProduct(page.request, mate.id, { stock: 0 })
    await gotoStore(page, `/producto/${mate.slug}`)

    await expect(page.getByRole('link', { name: 'Consultar por mail' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('button', { name: 'Comprar ahora' })).toHaveCount(
      0,
    )
  })
})
