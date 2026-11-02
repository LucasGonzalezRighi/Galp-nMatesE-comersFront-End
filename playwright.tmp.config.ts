import { defineConfig, devices } from '@playwright/test'

// Config temporal del controlador: la tienda compilada en :4300 (el 3000 es el next dev de Lucas)
// con la GPU real (ANGLE sobre D3D11). Se borra al terminar.
const STORE_URL = 'http://localhost:4300'
const gpuArgs = ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist']

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  outputDir: 'test-results/tmp',
  projects: [
    {
      name: 'store-desktop',
      testMatch: /store\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: STORE_URL,
        launchOptions: { args: gpuArgs },
      },
    },
    {
      name: 'store-mobile',
      testMatch: /store\/.*\.spec\.ts/,
      use: { ...devices['Pixel 7'], baseURL: STORE_URL, launchOptions: { args: gpuArgs } },
    },
  ],
})
