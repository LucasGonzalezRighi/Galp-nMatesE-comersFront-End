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

/** Entra con las credenciales de prueba y espera a ver el saludo. */
async function logInAsAdmin(page: Page): Promise<void> {
  await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  await expect(page.getByRole('heading', { name: `Hola, ${ADMIN_EMAIL}` })).toBeVisible()
}

test.describe('dashboard: acceso', () => {
  test('entrar a / sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })

  test('con la contraseña incorrecta avisa y no deja entrar', async ({ page }) => {
    await logIn(page, ADMIN_EMAIL, 'contraseña-equivocada')
    await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos')
    await expect(page).toHaveURL(/\/login/)
  })

  test('con las credenciales de prueba muestra el saludo y los productos cargados', async ({
    page,
  }) => {
    await logInAsAdmin(page)
    await expect(page.getByText('Productos cargados: 27')).toBeVisible()
  })

  test('recargar la página mantiene la sesión', async ({ page }) => {
    await logInAsAdmin(page)
    await page.reload()
    await expect(page.getByRole('heading', { name: `Hola, ${ADMIN_EMAIL}` })).toBeVisible()
    await expect(page.getByText('Productos cargados: 27')).toBeVisible()
  })

  test('Cerrar sesión vuelve a /login', async ({ page }) => {
    await logInAsAdmin(page)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
