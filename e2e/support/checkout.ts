import type { APIRequestContext, Locator, Page, TestInfo } from '@playwright/test'
import { gotoStore } from './store'
import { expect } from './test'

/** Un producto del catálogo de prueba que usan las compras de punta a punta. */
export interface CheckoutProduct {
  /** Identificador en la API simulada (`prd-…`), para las rutas de control. */
  id: string
  /** Ruta de la ficha. */
  slug: string
  /** Nombre visible. */
  name: string
  /** Precio de fábrica en pesos enteros. */
  priceArs: number
}

/** Datos de contacto del paso 1. */
export interface Buyer {
  /** Email, distinto en cada prueba. */
  email: string
  /** Nombre (el resultado aprobado dice "¡Gracias, {nombre}!"). */
  firstName: string
  /** Apellido. */
  lastName: string
}

/** Lo que el checkout guarda en `sessionStorage` (`galpon.order`) al crear el pedido. */
export interface StoredOrder {
  /** Número del pedido (`GLP-` y cinco dígitos). */
  number: string
  /** Token del pedido (cabecera `X-Order-Token`). */
  orderToken: string
}

/** Forma de envío del paso 2, por su nombre visible. */
export type ShippingChoice = 'Envío a domicilio' | 'Retiro en persona'

/** Medio de pago del paso 3, por su nombre visible. */
export type PaymentChoice = 'Mercado Pago' | 'Tarjeta de crédito o débito'

/**
 * Producto de las compras comunes. Todas las pruebas comparten la misma base simulada (vive en el
 * proceso de Next), así que antes de usarlo se le sube el stock: ninguna reserva lo agota y la
 * suite se puede repetir contra el mismo servidor.
 */
export const DEFAULT_PRODUCT: CheckoutProduct = {
  id: 'prd-imperial-calabaza',
  slug: 'mate-imperial-de-calabaza',
  name: 'Mate Imperial de Calabaza',
  priceArs: 24999,
}

/**
 * Productos a los que la prueba del `409` les cambia el precio, uno por proyecto: escritorio y
 * celular corren a la vez y no tienen que pisarse. Ninguna otra prueba los usa.
 */
const PRICE_CHANGE_PRODUCTS: Readonly<Record<string, CheckoutProduct>> = {
  'store-desktop': {
    id: 'prd-camionero-aluminio',
    slug: 'camionero-virola-de-aluminio',
    name: 'Camionero Virola de Aluminio',
    priceArs: 24999,
  },
  'store-mobile': {
    id: 'prd-camionero-criollo',
    slug: 'camionero-criollo',
    name: 'Camionero Criollo',
    priceArs: 22999,
  },
}

/** Stock con el que se dejan los productos de estas pruebas. */
const PLENTY_OF_STOCK = 500

/** Tarjeta Visa de prueba de los campos simulados (cualquier número válido de 16 dígitos sirve). */
export const TEST_CARD = {
  number: '4509 9535 6623 3704',
  lastFour: '3704',
  expiration: '11/30',
  securityCode: '123',
  document: '12345678',
} as const

/**
 * Producto de la prueba del cambio de precio para el proyecto en curso.
 *
 * @param testInfo - Datos de la prueba de Playwright.
 * @returns El producto reservado para ese proyecto.
 * @throws {RangeError} Si el proyecto no es uno de la tienda.
 */
export function priceChangeProduct(testInfo: TestInfo): CheckoutProduct {
  const product = PRICE_CHANGE_PRODUCTS[testInfo.project.name]
  if (product === undefined) {
    throw new RangeError(`No hay producto para el proyecto "${testInfo.project.name}".`)
  }
  return product
}

/**
 * Comprador con un email único por prueba, proyecto y reintento.
 *
 * @param testInfo - Datos de la prueba de Playwright.
 * @param firstName - Nombre del comprador.
 */
export function buyerFor(testInfo: TestInfo, firstName = 'Lucía'): Buyer {
  const tag = `${testInfo.project.name}-${String(testInfo.workerIndex)}-${String(Date.now())}`
  return { email: `compra.${tag}@ejemplo.com`, firstName, lastName: 'Pérez' }
}

/**
 * Cambia el precio o el stock de un producto en la API simulada (ruta de control
 * `POST /api/v1/__mock/products/{id}`, solo en modo de prueba).
 *
 * @param request - Cliente HTTP de Playwright con la dirección de la tienda.
 * @param id - Identificador del producto.
 * @param change - Precio nuevo, stock nuevo o los dos.
 */
export async function changeMockProduct(
  request: APIRequestContext,
  id: string,
  change: { priceArs?: number; stock?: number },
): Promise<void> {
  const response = await request.post(`/api/v1/__mock/products/${id}`, { data: change })
  expect(response.status(), `No se pudo cambiar el producto ${id}`).toBe(200)
}

/**
 * Vence la reserva de un pedido pendiente (ruta de control
 * `POST /api/v1/__mock/orders/{number}/expire`, solo en modo de prueba).
 *
 * @param request - Cliente HTTP de Playwright con la dirección de la tienda.
 * @param number - Número del pedido.
 */
export async function expireMockOrder(request: APIRequestContext, number: string): Promise<void> {
  const response = await request.post(`/api/v1/__mock/orders/${number}/expire`)
  expect(response.status(), `No se pudo vencer el pedido ${number}`).toBe(200)
}

/** Botón del encabezado que abre el carrito. */
function cartButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Abrir carrito/ })
}

/**
 * Deja el producto con stock de sobra, lo agrega una vez desde su ficha y espera a que el carrito
 * lo cuente.
 *
 * @param page - Página de Playwright.
 * @param product - Producto a comprar.
 */
export async function addToCart(page: Page, product: CheckoutProduct): Promise<void> {
  await changeMockProduct(page.request, product.id, { stock: PLENTY_OF_STOCK })
  await gotoStore(page, `/producto/${product.slug}`)
  await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).first().click()
  await expect(cartButton(page)).toHaveAccessibleName('Abrir carrito, 1 producto')
}

/**
 * Elige una opción de envío o de pago. El radio nativo está oculto a la vista (`sr-only`) dentro
 * de la tarjeta de la opción, así que se toca la tarjeta, como haría una persona.
 *
 * @param page - Página en el checkout.
 * @param name - Comienzo del nombre accesible de la opción.
 */
async function pickOption(page: Page, name: string): Promise<void> {
  const radio = page.getByRole('radio', { name: new RegExp(`^${name}`) })
  await page.locator('label').filter({ has: radio }).click()
  await expect(radio).toBeChecked()
}

/** Formulario de un paso del checkout ("Contacto" o "Envío"). */
export function stepForm(page: Page, name: 'Contacto' | 'Envío'): Locator {
  return page.getByRole('form', { name })
}

/** Botón de la barra de pasos que marca el paso actual. */
export function currentStep(page: Page): Locator {
  return page
    .getByRole('navigation', { name: 'Pasos del checkout' })
    .locator('[aria-current="step"]')
}

/**
 * Completa el paso 1 (Contacto) y sigue.
 *
 * @param page - Página en `/checkout`, en el paso 1.
 * @param buyer - Datos de contacto.
 */
export async function fillContact(page: Page, buyer: Buyer): Promise<void> {
  const form = stepForm(page, 'Contacto')
  await form.getByLabel('Email').fill(buyer.email)
  await form.getByLabel('Nombre').fill(buyer.firstName)
  await form.getByLabel('Apellido').fill(buyer.lastName)
  await form.getByRole('button', { name: 'Continuar' }).click()
}

/**
 * Completa el paso 2 (Envío) y sigue. A domicilio carga una dirección de CABA; el retiro no pide
 * dirección.
 *
 * @param page - Página en `/checkout`, en el paso 2.
 * @param choice - Forma de envío.
 */
export async function fillShipping(page: Page, choice: ShippingChoice): Promise<void> {
  const form = stepForm(page, 'Envío')
  await pickOption(page, choice)
  if (choice === 'Envío a domicilio') {
    await form.getByLabel('Calle').fill('Av. Corrientes')
    await form.getByLabel('Número', { exact: true }).fill('1234')
    await form.getByLabel('Código postal').fill('1414')
    await form.getByLabel('Ciudad').fill('Buenos Aires')
    await form.getByLabel('Provincia').selectOption('CABA')
  }
  await form.getByRole('button', { name: 'Continuar' }).click()
}

/**
 * Agrega el producto, abre el checkout y completa los pasos 1 y 2: queda en el paso 3 (Pago) con
 * los medios de pago habilitados.
 *
 * @param page - Página de Playwright.
 * @param buyer - Datos de contacto.
 * @param options - Producto y forma de envío; por defecto, {@link DEFAULT_PRODUCT} con retiro.
 */
export async function goToPayment(
  page: Page,
  buyer: Buyer,
  options: { product?: CheckoutProduct; shipping?: ShippingChoice } = {},
): Promise<void> {
  await addToCart(page, options.product ?? DEFAULT_PRODUCT)
  await gotoStore(page, '/checkout')
  await fillContact(page, buyer)
  await fillShipping(page, options.shipping ?? 'Retiro en persona')
  await expect(currentStep(page)).toContainText('Pago')
  await expect(paymentOption(page, 'Mercado Pago')).toBeEnabled()
}

/** Radio de un medio de pago del paso 3. */
export function paymentOption(page: Page, choice: PaymentChoice): Locator {
  return page.getByRole('radio', { name: new RegExp(`^${choice}`) })
}

/**
 * Elige un medio de pago en el paso 3: eso crea el pedido (Ruling P3-5).
 *
 * @param page - Página en el paso 3.
 * @param choice - Medio de pago.
 */
export async function choosePayment(page: Page, choice: PaymentChoice): Promise<void> {
  await pickOption(page, choice)
}

/** Botón "Pagar $X con Mercado Pago" del paso 3. */
export function payWithMpButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Pagar \$[\d.]+ con Mercado Pago$/ })
}

/** Botón "Pagar $X" de la tarjeta en el paso 3. */
export function payWithCardButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Pagar \$[\d.]+$/ })
}

/**
 * Lee el pedido en curso que el checkout guardó en `sessionStorage`.
 *
 * @param page - Página de la tienda.
 * @returns El número y el token del pedido.
 */
export async function readStoredOrder(page: Page): Promise<StoredOrder> {
  const raw = await page.evaluate(() => window.sessionStorage.getItem('galpon.order'))
  expect(raw, 'El checkout no guardó el pedido en sessionStorage').not.toBeNull()
  const parsed = JSON.parse(raw ?? '{}') as Partial<StoredOrder>
  expect(parsed.number).toMatch(/^GLP-\d{5}$/)
  return { number: parsed.number ?? '', orderToken: parsed.orderToken ?? '' }
}

/**
 * Elige Mercado Pago, paga y espera el simulador (`/checkout/mp-simulado`).
 *
 * @param page - Página en el paso 3.
 * @returns El pedido creado.
 */
export async function payWithMercadoPago(page: Page): Promise<StoredOrder> {
  await choosePayment(page, 'Mercado Pago')
  await payWithMpButton(page).click()
  await page.waitForURL(/\/checkout\/mp-simulado\?/)
  await expect(page.getByRole('heading', { name: 'Elegí cómo termina el pago' })).toBeVisible()
  return await readStoredOrder(page)
}

/**
 * Elige la tarjeta y completa los campos simulados (aparecen después de cargar su módulo).
 *
 * @param page - Página en el paso 3.
 * @param cardholderName - Titular: `APRO` aprueba, `OTHE` rechaza y `3DS` pide el desafío.
 */
export async function fillCard(page: Page, cardholderName: string): Promise<void> {
  await choosePayment(page, 'Tarjeta de crédito o débito')
  const number = page.getByLabel('Número de tarjeta')
  await expect(number).toBeVisible()
  await number.fill(TEST_CARD.number)
  await page.getByLabel('Nombre del titular').fill(cardholderName)
  await page.getByLabel('Vencimiento').fill(TEST_CARD.expiration)
  await page.getByLabel('CVC').fill(TEST_CARD.securityCode)
  await page.getByLabel('Número de documento').fill(TEST_CARD.document)
  await expect(page.getByLabel('Cuotas')).toBeEnabled()
}

/**
 * Espera la pantalla del resultado del pedido.
 *
 * @param page - Página de Playwright.
 * @param number - Número del pedido.
 */
export async function waitForResult(page: Page, number: string): Promise<void> {
  await page.waitForURL(`**/checkout/resultado?pedido=${number}`)
}
