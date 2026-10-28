import type { Page } from '@playwright/test'
import { expect, test } from '../support/test'

const ADMIN_EMAIL = 'admin@galponmates.com.ar'
const ADMIN_PASSWORD = 'galpon-demo-2026'

/** Completa el formulario de acceso y lo envía. */
async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

/** Entra con las credenciales de prueba y espera a ver el resumen. */
async function logInAsAdmin(page: Page): Promise<void> {
  await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible()
}

test.describe('dashboard: acceso', () => {
  test('entrar a / sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    await expect(page).toHaveTitle('Ingresar · Galpón Admin')
  })

  test('con la contraseña incorrecta avisa y no deja entrar', async ({ page }) => {
    await logIn(page, ADMIN_EMAIL, 'contraseña-equivocada')
    await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos')
    await expect(page).toHaveURL(/\/login/)
  })

  test('con las credenciales de prueba muestra el resumen y los contadores del menú', async ({
    page,
  }) => {
    await logInAsAdmin(page)
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await expect(nav.getByRole('link', { name: 'Pedidos, 3 para despachar' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Alertas de pago' })).toBeVisible()
  })

  test('recargar la página mantiene la sesión', async ({ page }) => {
    await logInAsAdmin(page)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible()
  })

  test('Cerrar sesión vuelve a /login', async ({ page }) => {
    await logInAsAdmin(page)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
