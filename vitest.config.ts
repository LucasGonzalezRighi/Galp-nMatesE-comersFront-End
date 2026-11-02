import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'packages',
          root: './packages',
          environment: 'node',
          include: ['*/src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'tooling',
          root: './scripts',
          environment: 'node',
          include: ['**/*.test.mjs'],
        },
      },
      {
        test: {
          name: 'store',
          root: './apps/store',
          alias: { '@': fileURLToPath(new URL('./apps/store/src', import.meta.url)) },
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        test: {
          name: 'admin',
          root: './apps/admin',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.*',
        '**/test/**',
        '**/generated/**',
        '**/routeTree.gen.ts',
        '**/mock/fixtures/**',
      ],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        'packages/domain/src/**': { lines: 100, functions: 100, statements: 100, branches: 95 },
        'packages/schemas/src/**': { lines: 100, functions: 100, statements: 100, branches: 95 },
      },
    },
  },
})
