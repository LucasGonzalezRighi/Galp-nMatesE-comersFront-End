import { defineConfig, devices } from '@playwright/test'

/** Origen donde se sirve la tienda compilada (`npm run start -w @galpon/store`). */
const STORE_URL = 'http://localhost:3000'

/** Origen donde se sirve el dashboard compilado (`npm run preview -w @galpon/admin`). */
const ADMIN_URL = 'http://localhost:5173'

/**
 * La prueba que vence la caché de todas las páginas de la tienda: regenera `categories` y `settings`,
 * que lee el pie. Va en su propio proyecto, `store-revalidation`.
 */
const REVALIDATION_SPEC = /store\/revalidation\.spec\.ts/

const isCi = Boolean(process.env.CI)

/**
 * Pruebas de punta a punta: la tienda en escritorio y celular y el dashboard en escritorio (flujos,
 * accesibilidad con axe, celular y capturas para las listas de control). La prueba de las etiquetas
 * de caché corre aparte, al final (proyecto `store-revalidation`).
 *
 * Prueban lo compilado, no el servidor de desarrollo, así que hay que correr `npm run build` antes,
 * con `API_MODE=mock` y `MOCK_ALLOWED_IN_PRODUCTION=true` (la tienda en producción no arranca sin
 * `API_MODE`; el CI las pone en el job de E2E):
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
      testIgnore: REVALIDATION_SPEC,
      use: { ...devices['Desktop Chrome'], baseURL: STORE_URL },
    },
    {
      name: 'store-mobile',
      testMatch: /store\/.*\.spec\.ts/,
      testIgnore: REVALIDATION_SPEC,
      use: { ...devices['Pixel 7'], baseURL: STORE_URL },
    },
    {
      name: 'admin-desktop',
      testMatch: /admin\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: ADMIN_URL },
    },
    {
      // Corre cuando terminaron los otros dos proyectos de la tienda. A la par, cada regeneración
      // les demora las navegaciones (toda página se vuelve a generar) y puede dejar guardada, como
      // nueva, una página que se estaba generando con el dato anterior a un cambio de otra prueba.
      // Sola: `npx playwright test --project=store-revalidation --no-deps`.
      name: 'store-revalidation',
      testMatch: REVALIDATION_SPEC,
      dependencies: ['store-desktop', 'store-mobile'],
      use: { ...devices['Desktop Chrome'], baseURL: STORE_URL },
    },
  ],
  webServer: [
    {
      command: 'npm run start -w @galpon/store',
      // `next start` corre en producción: con la API simulada hace falta permitirlo a propósito.
      env: { API_MODE: 'mock', MOCK_ALLOWED_IN_PRODUCTION: 'true' },
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
