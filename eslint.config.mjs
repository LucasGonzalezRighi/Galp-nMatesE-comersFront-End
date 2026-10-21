// @ts-check
import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import prettier from 'eslint-config-prettier'
import boundaries from 'eslint-plugin-boundaries'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import perfectionist from 'eslint-plugin-perfectionist'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/.next/**',
    '**/generated/**',
    '**/routeTree.gen.ts',
    '**/next-env.d.ts',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'docs/design/**',
  ]),
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'No se usa HTML crudo: renderizá texto (spec §16).',
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/**/*.tsx'],
    extends: [jsxA11y.flatConfigs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  { files: ['apps/admin/src/**/*.{ts,tsx}'], extends: [reactRefresh.configs.vite()] },
  {
    files: ['apps/store/**/*.{ts,tsx}'],
    extends: [nextPlugin.configs['core-web-vitals']],
    settings: { next: { rootDir: 'apps/store/' } },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { perfectionist },
    // Grupos de imports seguidos, sin línea en blanco: perfectionist v5 exige una por defecto.
    rules: {
      'perfectionist/sort-imports': [
        'error',
        { type: 'natural', internalPattern: ['^@galpon/.+', '^@/.+'], newlinesBetween: 0 },
      ],
    },
  },
  {
    files: ['packages/*/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true, noWarnOnMultipleProjects: true } },
      'boundaries/root-path': import.meta.dirname,
      'boundaries/elements': [
        {
          type: 'feature',
          pattern: 'apps/*/src/features/*',
          capture: ['app', 'feature'],
          partialMatch: false,
        },
        { type: 'app', pattern: 'apps/*', capture: ['app'], partialMatch: false },
        { type: 'domain', pattern: 'packages/domain', partialMatch: false },
        { type: 'schemas', pattern: 'packages/schemas', partialMatch: false },
        { type: 'api-client', pattern: 'packages/api-client', partialMatch: false },
        { type: 'design-tokens', pattern: 'packages/design-tokens', partialMatch: false },
      ],
    },
    rules: {
      ...boundaries.configs.strict.rules,
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'schemas' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'design-tokens' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'api-client' } },
              allow: { to: { element: { type: ['schemas', 'domain'] } } },
            },
            {
              from: { element: { type: ['app', 'feature'] } },
              allow: {
                to: { element: { type: ['domain', 'schemas', 'api-client', 'design-tokens'] } },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    type: 'feature',
                    captured: { app: '{{ from.element.captured.app }}' },
                  },
                },
              },
            },
            {
              from: { element: { type: 'feature' } },
              allow: {
                to: {
                  element: {
                    type: ['feature', 'app'],
                    captured: { app: '{{ from.element.captured.app }}' },
                  },
                },
              },
            },
            {
              to: { element: { type: 'feature' } },
              disallow: { to: { element: { fileInternalPath: '!index.ts' } } },
              message: 'Importá la feature solo por su index.ts',
            },
          ],
        },
      ],
    },
  },
  prettier,
)
