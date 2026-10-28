import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { ADMIN_SCREENS, expireSession, gotoAdmin, logInAsAdmin } from '../support/admin'
import { seriousViolations } from '../support/axe'
import { expect, test } from '../support/test'

/** Pantallas con sesión que revisa axe (las de Contenido, solo Inicio y Legales). */
const AUDITED = [
  'dashboard',
  'products',
  'product-new',
  'product-photos',
  'orders',
  'order',
  'content-home',
  'content-legal',
  'settings',
  'reviews',
  'messages',
  'account',
]

/**
 * Desvío 1 de `docs/design/admin/CHECKLIST-P4.md`, a corregir en `apps/admin/src/app/AdminSidebar.tsx`:
 * los enlaces del menú con contador se ven como "Pedidos3" (el nombre y el badge, sin espacio) y se
 * llaman "Pedidos, 3 para despachar", así que axe marca `label-content-name-mismatch` (WCAG 2.5.3).
 * Esa regla se sigue revisando en toda la página salvo en esos enlaces; al corregirlo, se borran
 * estas dos constantes y `violations` vuelve a ser `seriousViolations`.
 */
const KNOWN_RULE = 'label-content-name-mismatch'

/** Los enlaces del menú con contador (son los únicos con `aria-label`). */
const KNOWN_NODES = 'nav[aria-label="Principal"] a[aria-label]'

/**
 * Lo serio o crítico que encuentra axe, sin el desvío conocido de los contadores del menú.
 *
 * @param page - Página ya cargada, en el estado a revisar.
 * @returns Una línea por violación; vacío si no hay.
 */
async function violations(page: Page): Promise<string[]> {
  const others = (await seriousViolations(page)).filter(
    (line) => !line.startsWith(`${KNOWN_RULE} `),
  )
  const known = await new AxeBuilder({ page })
    .withRules([KNOWN_RULE])
    .exclude(KNOWN_NODES)
    .analyze()
  const rest = known.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  )
  return [...others, ...rest]
}

// Con movimiento reducido los diálogos quedan en su estado final: axe no mide el contraste de un
// elemento a medio aparecer.
test.use({ reducedMotion: 'reduce' })

test.describe('dashboard: accesibilidad (axe)', () => {
  test('ingreso no tiene violaciones serias ni críticas', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    expect(await violations(page)).toEqual([])
  })

  for (const screen of ADMIN_SCREENS.filter((item) => AUDITED.includes(item.name))) {
    test(`${screen.name} (${screen.path}) no tiene violaciones serias ni críticas`, async ({
      page,
    }) => {
      await logInAsAdmin(page)
      await gotoAdmin(page, screen)
      expect(await violations(page)).toEqual([])
    })
  }

  test('líneas con el diálogo de una línea nueva abierto', async ({ page }) => {
    await logInAsAdmin(page)
    await gotoAdmin(page, { path: '/lineas', heading: 'Líneas' })
    expect(await violations(page)).toEqual([])
    await page.getByRole('button', { name: 'Nueva línea' }).click()
    await expect(page.getByRole('dialog', { name: 'Nueva línea' })).toBeVisible()
    expect(await violations(page)).toEqual([])
  })

  test('el diálogo de sesión vencida', async ({ page }) => {
    await page.clock.install()
    await logInAsAdmin(page)
    await expireSession(page)
    expect(await violations(page)).toEqual([])
  })
})
