import { defineConfig, devices } from '@playwright/test'

/** Origen donde se sirve la tienda compilada (`npm run start -w @galpon/store`). */
const STORE_URL = 'http://localhost:3000'

/** Origen donde se sirve el dashboard compilado (`npm run preview -w @galpon/admin`). */
const ADMIN_URL = 'http://localhost:5173'

const isCi = Boolean(process.env.CI)

/**
 * Pruebas de punta a punta: la tienda en escritorio y celular y el dashboard en escritorio (flujos,
 * accesibilidad con axe, celular y capturas para las listas de control).
 *
 * Prueban lo compilado, no el servidor de desarrollo, así que hay que correr `npm run build` antes:
 * se levantan los dos servidores aunque se pida un solo proyecto. Fuera del CI reutilizan los
 * servidores que ya estén levantados en esos puertos.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: isCi ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'on-first-retry' },
  projects: [
    {
      name: 'store-desktop',
      testMatch: /store\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: STORE_URL },
    },
    {
      name: 'store-mobile',
      testMatch: /store\/.*\.spec\.ts/,
      use: { ...devices['Pixel 7'], baseURL: STORE_URL },
    },
    {
      name: 'admin-desktop',
      testMatch: /admin\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: ADMIN_URL },
    },
  ],
  webServer: [
    {
      command: 'npm run start -w @galpon/store',
      url: STORE_URL,
      reuseExistingServer: !isCi,
      timeout: 120_000,
    },
    {
      command: 'npm run preview -w @galpon/admin',
      url: ADMIN_URL,
      reuseExistingServer: !isCi,
      timeout: 120_000,
    },
  ],
})
