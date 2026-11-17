import type { Page } from '@playwright/test'
import { addToCart, buyerFor, DEFAULT_PRODUCT, fillContact, stepForm } from '../support/checkout'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/** Lo que se mide del elemento enfocado en cada parada de Mayús+Tab. */
interface FocusStop {
  /** Descripción corta del elemento (etiqueta y nombre), para el mensaje del error. */
  label: string
  /** Si el elemento está dentro del encabezado. */
  inHeader: boolean
  /** Si se pudo medir: tiene tamaño y su centro cae dentro de la ventana. */
  measurable: boolean
  /** Si `elementFromPoint` del centro es el elemento o un descendiente suyo (no lo tapa nada). */
  visible: boolean
}

/** Mide el elemento enfocado después de que el desplazamiento por el foco se asienta. */
async function measureFocus(page: Page): Promise<FocusStop> {
  return page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) {
      return { label: '(nada)', inHeader: false, measurable: false, visible: false }
    }
    const label = `${active.tagName.toLowerCase()} "${(active.getAttribute('aria-label') ?? active.textContent).trim().slice(0, 40)}"`
    const box = active.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    const measurable =
      box.width > 1 &&
      box.height > 1 &&
      x >= 0 &&
      y >= 0 &&
      x < window.innerWidth &&
      y < window.innerHeight
    const hit = measurable ? document.elementFromPoint(x, y) : null
    return {
      label,
      inHeader: active.closest('header') !== null,
      measurable,
      visible: hit !== null && (hit === active || active.contains(hit)),
    }
  })
}

test.describe('tienda: teclado y foco', () => {
  test.use({ reducedMotion: 'reduce' })

  test('el primer Tab de /tienda enfoca "Saltar al contenido" y Enter deja el foco en el contenido', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Con el teclado físico: solo en escritorio.')
    await gotoStore(page, '/tienda')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Saltar al contenido' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('#contenido')).toBeFocused()
  })

  test('con Mayús+Tab desde el pie hasta el encabezado, el encabezado nunca tapa el foco', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Con el teclado físico: solo en escritorio.')
    test.slow()
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoStore(page, '/producto/mate-imperial-premium')
    await page.locator('footer a').last().focus()

    const hidden: string[] = []
    let stops = 0
    for (; stops < 250; stops += 1) {
      await page.keyboard.press('Shift+Tab')
      const stop = await measureFocus(page)
      if (stop.inHeader) break
      if (stop.measurable && !stop.visible) hidden.push(stop.label)
    }
    expect(stops, 'llega al encabezado').toBeLessThan(250)
    expect(hidden).toEqual([])
  })

  test('en el checkout, "Continuar" deja el foco en el título del paso 2', async ({
    page,
  }, testInfo) => {
    test.slow()
    await addToCart(page, DEFAULT_PRODUCT)
    await gotoStore(page, '/checkout')
    await expect(stepForm(page, 'Contacto')).toBeVisible()
    await fillContact(page, buyerFor(testInfo))
    await expect(stepForm(page, 'Envío')).toBeVisible()
    const focused = page.locator('h2:focus')
    await expect(focused).toHaveText('Envío')
  })

  test('en /cuenta/ingresar, con una contraseña equivocada el foco sigue en "Ingresar"', async ({
    page,
  }) => {
    await gotoStore(page, '/cuenta/ingresar')
    const login = page.getByRole('main')
    await login.getByLabel('Email').fill('nadie@example.com')
    await login.getByLabel('Contraseña', { exact: true }).fill('otra-clave-123')
    const submit = login.getByRole('button', { name: 'Ingresar', exact: true })
    await submit.focus()
    await page.keyboard.press('Enter')
    await expect(login.getByText('Email o contraseña incorrectos.')).toBeVisible()
    await expect(submit).toBeFocused()
  })

  test('en el inicio, cada punto del carrusel mide al menos 24 × 24', async ({ page }) => {
    await gotoStore(page, '/')
    const dots = page.getByRole('group', { name: 'Elegir pieza' }).getByRole('button')
    const count = await dots.count()
    expect(count).toBeGreaterThan(1)
    for (let index = 0; index < count; index += 1) {
      const box = await dots.nth(index).boundingBox()
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
    }
  })
})
