import type { APIRequestContext, Page } from '@playwright/test'
import { gotoStore } from '../support/store'
import { expect, test } from '../support/test'

/**
 * Secreto de `POST /api/revalidate`: el de la tienda que corre (`REVALIDATE_SECRET`) o, si no se
 * definió, el de desarrollo que la tienda usa en modo de prueba.
 */
const REVALIDATE_SECRET =
  process.env.REVALIDATE_SECRET ?? 'dev-only-revalidate-secret-change-me-0000'

/** Una ficha y una línea compiladas de antemano (están en `generateStaticParams`). */
const PRODUCT = { path: '/producto/mate-imperial-premium', heading: 'Mate Imperial Premium' }
const LINE = { path: '/tienda/imperiales', heading: 'Imperiales' }

/** Una ficha y una línea que no existen, con el título del aviso que muestran. */
const NOT_FOUND = [
  { path: '/producto/no-existe', heading: 'No encontramos ese producto.' },
  { path: '/tienda/no-existe', heading: 'No encontramos esa página' },
]

/**
 * Lo que pide regenerar el backend: cada etiqueta sola (`categories` y `settings` dejaban las
 * fichas y las líneas en 500) y el aviso de un guardado de producto del dashboard.
 */
const NOTICES: readonly (readonly string[])[] = [
  ['categories'],
  ['settings'],
  ['products', 'product:mate-imperial-premium', 'categories', 'combos'],
]

/** Marca que se pone en `window`: si sigue después de un click, la navegación fue del cliente. */
type MarkedWindow = Window & { revalidationSpecMark?: boolean }

/** Pide regenerar las etiquetas como lo hace el backend y espera el 200. */
async function revalidate(request: APIRequestContext, tags: readonly string[]): Promise<void> {
  const response = await request.post('/api/revalidate', {
    headers: { 'x-revalidate-secret': REVALIDATE_SECRET },
    data: { tags },
  })
  expect(response.status(), `POST /api/revalidate ${tags.join(', ')}`).toBe(200)
  expect(await response.json()).toEqual({ revalidated: tags })
}

/** Espera el título de la página y que el pie siga mostrando las líneas. */
async function expectContent(page: Page, heading: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'Imperiales', exact: true }),
  ).toBeAttached()
}

/** Abre la página con una carga completa y espera un 200 con su contenido. */
async function expectPage(page: Page, path: string, heading: string): Promise<void> {
  const response = await page.goto(path)
  expect(response?.status(), `GET ${path}`).toBe(200)
  await expectContent(page, heading)
}

// Vence la caché de todas las páginas de la tienda, así que corre en su propio proyecto
// (`store-revalidation`), cuando terminaron las demás pruebas de la tienda.
test.describe('tienda: regenerar etiquetas no rompe las fichas ni las líneas', () => {
  test.describe.configure({ mode: 'serial' })

  for (const tags of NOTICES) {
    test(`después de regenerar ${tags.join(', ')}, la ficha y la línea responden 200`, async ({
      page,
      request,
    }) => {
      await expectPage(page, PRODUCT.path, PRODUCT.heading)
      await expectPage(page, LINE.path, LINE.heading)

      // Primero con cargas completas, dos vueltas: el 500 no se iba solo, quedaba hasta reiniciar.
      await revalidate(request, tags)
      for (let round = 0; round < 2; round += 1) {
        await expectPage(page, PRODUCT.path, PRODUCT.heading)
        await expectPage(page, LINE.path, LINE.heading)
      }

      // Después con el router del cliente y las páginas otra vez recién vencidas: también recibía
      // una ficha a medias ("This page couldn't load"). La marca en `window` prueba que no hizo una
      // carga completa.
      await revalidate(request, tags)
      await gotoStore(page, '/tienda')
      await page.evaluate(() => {
        ;(window as MarkedWindow).revalidationSpecMark = true
      })
      await page.getByRole('link', { name: PRODUCT.heading }).first().click()
      await expect(page).toHaveURL(PRODUCT.path)
      await expectContent(page, PRODUCT.heading)
      await page
        .getByRole('navigation', { name: 'Ruta de navegación' })
        .getByRole('link', { name: LINE.heading })
        .click()
      await expect(page).toHaveURL(LINE.path)
      await expectContent(page, LINE.heading)
      expect(await page.evaluate(() => (window as MarkedWindow).revalidationSpecMark)).toBe(true)

      // Lo que no existe sigue respondiendo 404 con el aviso.
      for (const missing of NOT_FOUND) {
        const response = await page.goto(missing.path)
        expect(response?.status(), `GET ${missing.path}`).toBe(404)
        await expect(page.getByRole('heading', { level: 1, name: missing.heading })).toBeVisible()
      }
    })
  }
})
