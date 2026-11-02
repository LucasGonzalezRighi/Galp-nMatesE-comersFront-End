# P1 · Fundaciones y contrato — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar listo el workspace del front: reglas de negocio y validaciones probadas, tokens del diseño, el contrato OpenAPI completo, un cliente tipado con modo de prueba, y las dos apps arrancando contra la API simulada, con lint, tests, E2E y CI.

**Architecture:** Workspace npm (workspaces) en la raíz del repo (`frontend/`) con cinco paquetes TypeScript sin paso de build (`config`, `design-tokens`, `domain`, `schemas`, `api-client`) que exportan su código fuente, y dos apps: `apps/store` (Next.js 16) y `apps/admin` (Vite 8). `docs/api/openapi.yaml` genera los tipos del cliente. El modo de prueba es un `fetch` en memoria. La tienda lo corre en su servidor (route handler + rewrite de mismo dominio). El admin lo corre en el navegador, persistido en `sessionStorage`.

**Tech Stack:** npm 10 (workspaces, versiones exactas centralizadas) · TypeScript 6.0.3 · Next.js 16.4.2 + React 19.3.1 · Vite 8.3.4 + TanStack Router/Query · Tailwind CSS 4.3.3 · Zod 4.6.7 · openapi-typescript 7.13 + openapi-fetch 0.17 · Vitest 5 · Playwright 1.64 · ESLint 9.39 + typescript-eslint 8.71 · lefthook 2.2

**Spec:** `docs/superpowers/specs/2026-10-19-galpon-frontend-design.md`. Este plan cubre P1 (sección 21.1) e implementa las secciones 4–8, 12, 13, 15, 16 (CSP), 19 y 20 en lo que corresponde a fundaciones.

## Global Constraints

- La raíz del repo git es la del workspace: `E-comers Marcos/frontend/`. **Solo commits locales**: nunca `git push` ni configurar remotos (D11). No tocar `../backend` ni `../database`.
- Gestor de paquetes: **npm** con workspaces. Lucas instala con `npm i` y levanta todo con `npm run dev` desde `frontend/` (tienda en :3000 y admin en :5173). Node local 22.20 (`engines.node: ">=22.12"`, `engines.npm: ">=10"`); `.nvmrc` y CI usan 24.
- Versiones **exactas** (sin `^` ni `~`) tomadas de `scripts/dependency-versions.json`, la fuente única de versiones; los paquetes propios se declaran con `"*"`. `npm run lint` corre `scripts/check-dependency-versions.mjs`, que falla si algún `package.json` se desvía. No subir a TypeScript 7, ESLint 10 ni jsdom 30. `openapi-typescript` no se instala: se ejecuta con `npx --yes openapi-typescript@7.13.0` (su peer pide TypeScript 5 y npm no admite ese conflicto).
- TypeScript: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`, `skipLibCheck: true`. Sin `exactOptionalPropertyTypes`. TS 6 ya no incluye `@types/*` solo: cada tsconfig declara su `types`.
- Prohibido: `any`, `@ts-ignore`, `@ts-expect-error` sin descripción, `console.*`, `!` (non-null), `dangerouslySetInnerHTML`, importar archivos internos de otra feature.
- Identificadores y archivos en inglés. Textos de interfaz, mensajes de error y TSDoc en español. TSDoc en todo lo exportado.
- Montos: enteros de pesos (tipo `Pesos`), con sufijo `Ars` en el contrato. Formato "$39.999" (sin espacio). Descuentos con "−" (U+2212).
- Toda fecha visible se muestra en `America/Argentina/Buenos_Aires`.
- Fin de línea LF en todo el repo (`.gitattributes`), aunque se trabaje en Windows.
- Commits convencionales en español. Todo mensaje de commit termina con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Comandos en Git Bash, desde `frontend/` salvo que se indique otra cosa.

## Refinamientos del spec que introduce este plan

Se aplican también al spec en la Task 17:

1. **Contenido por rutas separadas.** En lugar de `GET /content/{page}` se usan `GET /content/home`, `/content/about`, `/content/faq`, `/content/footer`, `/content/product-tabs` y `/content/legal/{document}` (`terms` | `privacy`), y lo mismo en `/admin/content/...`. Así cada respuesta tiene su tipo exacto.
2. **Slug viejo.** `GET /products/{slug}` con un slug anterior responde `200` con el producto y su `slug` actual, y la página de la tienda redirige con `permanentRedirect` (308). Para el usuario es lo mismo, y se evita que `fetch` siga la redirección por su cuenta.
3. **Pestañas.** `ProductDetail.tabs = { descriptionNote: string | null, materials, shipping, care }`. La pestaña Descripción muestra `description` y, si existe, `descriptionNote`; por ejemplo, la nota de "cada pieza es artesanal" de los mates.
4. **Login del admin.** `POST /admin/auth/login` devuelve `{ email, csrfToken, expiresAt }`. `GET /admin/auth/csrf` lo vuelve a entregar después de una recarga.
5. **Typecheck en pre-push.** lefthook corre `typecheck` en `pre-push` (antes de que Lucas suba), no en `pre-commit`, para que los commits sigan siendo rápidos.
6. **Export de fixtures.** La exportación a JSON para el seed se hace en la fase 2. En P1 los fixtures solo se garantizan serializables a JSON (hay un test).
7. **npm en lugar de pnpm** (pedido de Lucas, 2026-10-20: va a instalar con `npm i` y levantar con `npm run dev`). npm workspaces; versiones exactas centralizadas en `scripts/dependency-versions.json` con un chequeo en `npm run lint`; `openapi-typescript` vía `npx`; `npm run dev` levanta tienda y admin juntos con `concurrently`. El spec ya está actualizado.

## Review Focus

1. **Fechas en el borde del mes.** Una reseña con `createdAt` `2026-09-01T02:00:00Z` se muestra "Ago 2026", porque en Buenos Aires todavía es 31 de agosto → test en la Task 4.
2. **Búsqueda con acentos y mayúsculas.** "bombillon" y "BOMBILLÓN" encuentran "Bombillón Curvo", y "te y jengibre" encuentra "Té y Jengibre" → test en la Task 2.
3. **Base simulada única en el servidor de Next.** Dos instancias del módulo de la base (bundles por ruta o HMR) ven los mismos datos → test en la Task 12 (singleton en `globalThis`).
4. **Admin con `sessionStorage` bloqueado** (navegación privada, políticas del navegador). En modo de prueba sigue funcionando en memoria en lugar de romperse → test en la Task 12.
5. **Configuración incoherente al compilar.** `API_MODE=live` sin `API_BASE_URL`, o `NEXT_PUBLIC_API_MODE` distinto de `API_MODE`, hace fallar `next build` con un mensaje en español en lugar de compilar una tienda que apunta al mock → test en la Task 14.

---

### Task 1: Workspace, toolchain y primer módulo de `domain` (dinero)

**Files:**
- Create: `package.json`, `scripts/dependency-versions.json`, `scripts/check-dependency-versions.mjs`, `.nvmrc`, `.editorconfig`, `.gitattributes`, `.prettierignore`, `prettier.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `tsconfig.json`, `lefthook.yml`
- Modify: `.gitignore`
- Create: `packages/config/{package.json, tsconfig.base.json, tsconfig.react.json, prettier.config.mjs, README.md}`
- Create: `packages/domain/{package.json, tsconfig.json, README.md}`, `packages/domain/src/{index.ts, money.ts}`
- Test: `packages/domain/src/money.test.ts`, `scripts/check-dependency-versions.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `@galpon/config/tsconfig.base.json` (libs ES2023, sin DOM, `types: []`), `@galpon/config/tsconfig.react.json` (extiende la base + `DOM`, `DOM.Iterable`, `jsx: "react-jsx"`), `@galpon/config/prettier`.
  - `@galpon/domain`: `type Pesos = number & { readonly __brand: 'Pesos' }`, `pesos(value: number): Pesos` (lanza `RangeError` si no es un entero seguro ≥ 0), `formatPesos(value: Pesos): string`, `formatDiscountPesos(value: Pesos): string`, `formatDiscountPercent(percent: number): string`, `sumPesos(values: readonly Pesos[]): Pesos`.
  - `scripts/check-dependency-versions.mjs` exporta `findVersionProblems(manifests: { path: string; json: object }[], versions: Record<string, string>): string[]` y, ejecutado directo, revisa la raíz, `apps/*` y `packages/*`, imprime los problemas en español y sale con 1 si hay alguno.
  - Scripts raíz: `dev`, `dev:store`, `dev:admin`, `build`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:coverage`, `test:e2e`, `api:lint`, `api:generate`, `api:check`, `prepare`.

- [ ] **Step 1: Crear `scripts/dependency-versions.json` exactamente así** (versiones verificadas el 2026-10-20, sin conflictos de peers; `openapi-typescript` figura solo como referencia de la versión que usa `npx`):

```json
{
  "@axe-core/playwright": "4.14.0",
  "@eslint/js": "9.39.5",
  "@fontsource-variable/inter": "5.3.0",
  "@hookform/resolvers": "5.9.2",
  "@mercadopago/sdk-js": "0.0.3",
  "@next/eslint-plugin-next": "16.4.2",
  "@phosphor-icons/react": "2.1.10",
  "@playwright/test": "1.64.1",
  "@redocly/cli": "2.65.0",
  "@tailwindcss/turbopack": "4.3.3",
  "@tailwindcss/vite": "4.3.3",
  "@tanstack/react-query": "5.104.4",
  "@tanstack/react-router": "1.170.45",
  "@tanstack/react-table": "9.3.1",
  "@tanstack/router-cli": "1.167.45",
  "@tanstack/router-plugin": "1.168.47",
  "@testing-library/dom": "10.4.2",
  "@testing-library/jest-dom": "7.0.1",
  "@testing-library/react": "16.3.3",
  "@testing-library/user-event": "14.6.8",
  "@types/node": "22.20.5",
  "@types/react": "19.3.0",
  "@types/react-dom": "19.3.0",
  "@types/three": "0.186.0",
  "@vitejs/plugin-react": "6.1.2",
  "@vitest/coverage-v8": "5.0.5",
  "concurrently": "10.0.6",
  "eslint": "9.39.5",
  "eslint-config-prettier": "10.1.8",
  "eslint-import-resolver-typescript": "4.4.5",
  "eslint-plugin-boundaries": "7.2.0",
  "eslint-plugin-jsx-a11y": "6.10.2",
  "eslint-plugin-perfectionist": "5.12.1",
  "eslint-plugin-react-hooks": "7.1.1",
  "eslint-plugin-react-refresh": "0.5.7",
  "globals": "17.13.0",
  "jsdom": "29.1.1",
  "lefthook": "2.2.2",
  "motion": "14.4.0",
  "next": "16.4.2",
  "openapi-fetch": "0.17.0",
  "openapi-typescript": "7.13.0",
  "prettier": "3.9.10",
  "prettier-plugin-tailwindcss": "0.8.1",
  "radix-ui": "1.8.1",
  "react": "19.3.1",
  "react-dom": "19.3.1",
  "react-hook-form": "7.90.0",
  "server-only": "0.0.1",
  "tailwindcss": "4.3.3",
  "three": "0.186.1",
  "typescript": "6.0.3",
  "typescript-eslint": "8.71.2",
  "vite": "8.3.4",
  "vitest": "5.0.5",
  "yaml": "2.9.1",
  "zod": "4.6.7",
  "zustand": "5.0.15"
}
```

- [ ] **Step 2: Crear el `package.json` raíz**: `"name": "galpon-frontend"`, `"private": true`, `"type": "module"`, `"workspaces": ["apps/*", "packages/*"]`, `"engines": { "node": ">=22.12", "npm": ">=10" }` (sin `packageManager`). Scripts:

| Script | Comando |
|---|---|
| `dev` | `concurrently -n tienda,admin -c yellow,cyan "npm:dev:store" "npm:dev:admin"` |
| `dev:store` | `npm run dev -w @galpon/store` |
| `dev:admin` | `npm run dev -w @galpon/admin` |
| `build` | `npm run build -w @galpon/store -w @galpon/admin` |
| `typecheck` | `npm run typecheck --workspaces --if-present && tsc --noEmit -p tsconfig.json` |
| `lint` | `node scripts/check-dependency-versions.mjs && eslint .` |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` |
| `test` / `test:coverage` | `vitest run` / `vitest run --coverage` |
| `test:e2e` | `playwright test` |
| `api:lint` | `redocly lint docs/api/openapi.yaml` |
| `api:generate` / `api:check` | `npm run api:generate -w @galpon/api-client` / `npm run api:check -w @galpon/api-client` |
| `prepare` | `lefthook install` |

Los scripts que apuntan a `apps/*` o a `@galpon/api-client` funcionan recién cuando esos workspaces existen (Tasks 10, 14 y 15).

devDependencies raíz, con la versión exacta de `scripts/dependency-versions.json`: `typescript`, `@types/node`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-boundaries`, `eslint-import-resolver-typescript`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@next/eslint-plugin-next`, `eslint-plugin-perfectionist`, `eslint-config-prettier`, `globals`, `prettier`, `prettier-plugin-tailwindcss`, `vitest`, `@vitest/coverage-v8`, `vite`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `@redocly/cli`, `lefthook`, `yaml`, `concurrently`. Además, `"@galpon/config": "*"`.

`scripts/check-dependency-versions.mjs` (JavaScript sin dependencias, con JSDoc):
  - Para cada `package.json` de la raíz, `apps/*` y `packages/*`, revisa `dependencies`, `devDependencies` y `peerDependencies`.
  - Un paquete `@galpon/*` tiene que declararse `"*"`.
  - Cualquier otro paquete tiene que estar en `dependency-versions.json`. En `dependencies` y `devDependencies` su versión es exactamente la del JSON; en `peerDependencies`, `^` + esa versión.
  - Mensajes: `apps/store/package.json: "next" declara "^16.4.2" y la versión fijada es "16.4.2"`, `…: "lodash" no está en scripts/dependency-versions.json`.

- [ ] **Step 3: Archivos de entorno del repo**
  - `.nvmrc` → `24`.
  - `.editorconfig`: utf-8, LF, 2 espacios, newline final.
  - `.gitattributes`: `* text=auto eol=lf`; `*.png`, `*.jpg`, `*.woff2` e `*.ico` como `binary`.
  - Agregar a `.gitignore`: `next-env.d.ts`, `.vitest/`, `*.local` y `.env.local`.
  - `.prettierignore`: `package-lock.json`, `**/generated/**`, `**/routeTree.gen.ts`, `docs/design/**`, `coverage`, `.next`, `dist`, `playwright-report`, `test-results`.

- [ ] **Step 4: Paquete `packages/config`** (`"name": "@galpon/config"`, `exports` de los 3 archivos):
  - `tsconfig.base.json`: `target` y `lib` ES2023, `module: "ESNext"`, `moduleResolution: "bundler"`, `noEmit: true`, `resolveJsonModule`, `forceConsistentCasingInFileNames`, `types: []`, más las opciones de Global Constraints.
  - `prettier.config.mjs`: `{ semi: false, singleQuote: true, trailingComma: 'all', printWidth: 100, plugins: ['prettier-plugin-tailwindcss'] }`. El `prettier.config.mjs` raíz lo reexporta.
  - El README explica qué extiende cada app y cada paquete.

- [ ] **Step 5: `tsconfig.json` raíz**: extiende la base, `types: ["node"]` e `include: ["*.ts", "e2e/**/*.ts"]` (para `vitest.config.ts` y, más adelante, `playwright.config.ts` y e2e).

- [ ] **Step 6: `vitest.config.ts` raíz**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'packages', root: './packages', environment: 'node', include: ['*/src/**/*.test.ts'] } },
      { test: { name: 'tooling', root: './scripts', environment: 'node', include: ['**/*.test.mjs'] } },
      // La Task 14 agrega el proyecto 'store' y la Task 15 el proyecto 'admin'.
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.*', '**/test/**', '**/generated/**', '**/routeTree.gen.ts', '**/mock/fixtures/**'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        'packages/domain/src/**': { lines: 100, functions: 100, statements: 100, branches: 95 },
        'packages/schemas/src/**': { lines: 100, functions: 100, statements: 100, branches: 95 },
      },
    },
  },
})
```

Los proyectos de las apps se agregan cuando existen sus carpetas (Tasks 14 y 15), porque un `root` inexistente hace fallar Vitest.

- [ ] **Step 7: `eslint.config.mjs` raíz** (base probada con ESLint 9.39.5 y TS 6.0.3):

```js
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
    '**/dist/**', '**/.next/**', '**/generated/**', '**/routeTree.gen.ts', '**/next-env.d.ts',
    'coverage/**', 'playwright-report/**', 'test-results/**', 'docs/design/**',
  ]),
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': ['error', {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: 'No se usa HTML crudo: renderizá texto (spec §16).',
      }],
    },
  },
  { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked], languageOptions: { globals: globals.node } },
  { files: ['apps/**/*.tsx'], extends: [jsxA11y.flatConfigs.recommended, reactHooks.configs.flat.recommended], languageOptions: { globals: globals.browser } },
  { files: ['apps/admin/src/**/*.{ts,tsx}'], extends: [reactRefresh.configs.vite()] },
  { files: ['apps/store/**/*.{ts,tsx}'], extends: [nextPlugin.configs['core-web-vitals']], settings: { next: { rootDir: 'apps/store/' } } },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { perfectionist },
    rules: { 'perfectionist/sort-imports': ['error', { type: 'natural', internalPattern: ['^@galpon/.+', '^@/.+'] }] },
  },
  {
    files: ['packages/*/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true, noWarnOnMultipleProjects: true } },
      'boundaries/root-path': import.meta.dirname,
      'boundaries/elements': [
        { type: 'feature', pattern: 'apps/*/src/features/*', capture: ['app', 'feature'], partialMatch: false },
        { type: 'app', pattern: 'apps/*', capture: ['app'], partialMatch: false },
        { type: 'domain', pattern: 'packages/domain', partialMatch: false },
        { type: 'schemas', pattern: 'packages/schemas', partialMatch: false },
        { type: 'api-client', pattern: 'packages/api-client', partialMatch: false },
        { type: 'design-tokens', pattern: 'packages/design-tokens', partialMatch: false },
      ],
    },
    rules: {
      ...boundaries.configs.strict.rules,
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        policies: [
          { from: { element: { type: 'schemas' } }, allow: { to: { element: { type: 'domain' } } } },
          { from: { element: { type: 'api-client' } }, allow: { to: { element: { type: ['schemas', 'domain'] } } } },
          { from: { element: { type: ['app', 'feature'] } }, allow: { to: { element: { type: ['domain', 'schemas', 'api-client', 'design-tokens'] } } } },
          { from: { element: { type: 'app' } }, allow: { to: { element: { type: 'feature', captured: { app: '{{ from.element.captured.app }}' } } } } },
          { from: { element: { type: 'feature' } }, allow: { to: { element: { type: ['feature', 'app'], captured: { app: '{{ from.element.captured.app }}' } } } } },
          { to: { element: { type: 'feature' } }, disallow: { to: { element: { fileInternalPath: '!index.ts' } } }, message: 'Importá la feature solo por su index.ts' },
        ],
      }],
    },
  },
  prettier,
)
```

- [ ] **Step 8: `lefthook.yml`**

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: prettier
      glob: '*.{ts,tsx,js,mjs,json,css,md,yaml,yml}'
      run: npx prettier --write {staged_files}
      stage_fixed: true
    - name: eslint
      glob: '*.{ts,tsx,mjs}'
      run: npx eslint --fix {staged_files}
      stage_fixed: true
pre-push:
  jobs:
    - name: typecheck
      run: npm run typecheck
```

- [ ] **Step 9: Paquete `packages/domain`.** `package.json`: `"name": "@galpon/domain"`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, `"scripts": { "typecheck": "tsc --noEmit" }`. `tsconfig.json`: extiende `@galpon/config/tsconfig.base.json` e incluye `src`. Escribir el README: propósito (reglas de negocio puras, sin dependencias) y lista de módulos.

- [ ] **Step 10: Escribir el test que falla** en `packages/domain/src/money.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatDiscountPercent, formatDiscountPesos, formatPesos, pesos, sumPesos } from './money'

describe('money', () => {
  it('formatea pesos como el diseño, sin espacio', () => {
    expect(formatPesos(pesos(39999))).toBe('$39.999')
    expect(formatPesos(pesos(0))).toBe('$0')
    expect(formatPesos(pesos(1234567))).toBe('$1.234.567')
    expect(formatPesos(pesos(39999))).not.toMatch(/ /)
  })
  it('usa el signo menos U+2212 en descuentos', () => {
    expect(formatDiscountPesos(pesos(3600))).toBe('−$3.600')
    expect(formatDiscountPercent(10)).toBe('−10%')
  })
  it('rechaza montos que no son enteros seguros no negativos', () => {
    expect(() => pesos(-1)).toThrow(RangeError)
    expect(() => pesos(1.5)).toThrow(RangeError)
    expect(() => pesos(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError)
  })
  it('suma montos', () => {
    expect(sumPesos([])).toBe(0)
    expect(sumPesos([pesos(1), pesos(2)])).toBe(3)
  })
})
```

- [ ] **Step 11: Instalar y comprobar que el test falla**
  - Run: `npm install`. Expected: sin `ERR_PNPM_*` y sin líneas `unmet peer`. El hook queda instalado (existe `.git/hooks/pre-commit`).
  - Run: `npm test`. Expected: FAIL en `money.test.ts` (no existe `./money`).

- [ ] **Step 12: Implementar `money.ts`** con `new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })` antepuesto con `'$'`. Exportar todo desde `src/index.ts`. TSDoc en cada export.

- [ ] **Step 13: Verificar toda la cadena**
  - Run: `npm test` → PASS.
  - Run: `npm run lint` → 0 problemas.
  - Run: `npm run typecheck` → sin errores.
  - Run: `git add --renormalize . && npm run format:check` → todos los archivos formateados.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "chore: workspace npm, toolchain y módulo de dinero en domain" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `domain` — catálogo: opciones, compra, búsqueda, orden y relacionados

**Files:**
- Create: `packages/domain/src/{options.ts, catalog.ts, text.ts}`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/{options.test.ts, catalog.test.ts, text.test.ts}`

**Interfaces:**
- Consumes: `Pesos` (Task 1).
- Produces:
  - `options.ts`: `LEATHERS = ['Negro','Marrón','Crudo','Borravino'] as const`, `type Leather`, `DEFAULT_LEATHER: Leather = 'Negro'`, `FERRULES = ['Alpaca lisa','Alpaca cincelada','Acero'] as const`, `type Ferrule`, `DEFAULT_FERRULE = 'Alpaca cincelada'`, `KIT_FERRULE = 'Alpaca cincelada'`, `isLeather(v: string): v is Leather`, `isFerrule(v: string): v is Ferrule`.
  - `catalog.ts`: `PRODUCT_GROUPS = ['mate','bombilla','yerba'] as const`, `type ProductGroup`, `PRODUCT_STATUSES = ['draft','published','archived'] as const`, `type ProductStatus`, `MAX_QUANTITY_PER_PRODUCT = 20`, `isPurchasable(p: { status: ProductStatus; priceArs: Pesos | null; stock: number }): boolean`, `maxQuantity(stock: number): number`, `formatProductCode(sequence: number): string`, `PRODUCT_SORT_ORDERS = ['destacados','menor','mayor','az'] as const`, `type ProductSortOrder`, `isProductSortOrder(v: string): v is ProductSortOrder`, `sortProducts<T extends { name: string; priceArs: Pesos | null; featured: boolean }>(items: readonly T[], order: ProductSortOrder): T[]`, `selectRelated<T extends { id: string; categoryId: string; group: ProductGroup }>(product: T, catalog: readonly T[], limit?: number): T[]` (por defecto `limit = 4`).
  - `text.ts`: `normalizeSearchText(text: string): string`, `matchesSearch(query: string, fields: readonly string[]): boolean`, `slugify(text: string): string`.

- [ ] **Step 1: Escribir los tests que fallan**
  - `isPurchasable`: publicado + precio + stock > 0 → `true`; `priceArs: null` → `false`; `stock: 0` → `false`; `draft` → `false`; `archived` → `false`.
  - `maxQuantity`: `(50)` → 20; `(3)` → 3; `(0)` → 0; `(-2)` → 0.
  - `formatProductCode`: `(7)` → `'N°07'`; `(27)` → `'N°27'`; `(100)` → `'N°100'`.
  - `slugify`:
    - `'Bombillón Mini Premium Pico Loro (15 cm)'` → `'bombillon-mini-premium-pico-loro-15-cm'`
    - `'Torpedo Alpaca Cincelada c/Cuero'` → `'torpedo-alpaca-cincelada-c-cuero'`
    - `'Yerba Canarias Té y Jengibre 1 kg'` → `'yerba-canarias-te-y-jengibre-1-kg'`
    - `'  --Ñandú--  '` → `'nandu'`
  - `normalizeSearchText('  BOMBILLÓN   Curvo ')` → `'bombillon curvo'`.
  - `matchesSearch` (Review Focus 2). Es igual que el diseño: busca la consulta entera, normalizada, dentro de los campos unidos con espacios.
    - `('bombillon', ['Bombillón Curvo'])` → `true`
    - `('BOMBILLÓN', ['Bombillón Curvo'])` → `true`
    - `('te y jengibre', ['Yerba Canarias Té y Jengibre 1 kg'])` → `true`
    - `('curvo de alpaca', ['Bombillón Curvo de Alpaca'])` → `true`
    - `('', ['x'])` → `true`
    - `('xyz', ['Mate'])` → `false`
  - `sortProducts`:
    - `'menor'`: ascendente, con los `null` al final.
    - `'mayor'`: descendente, con los `null` al final.
    - `'az'`: `localeCompare` en español, así `'Ángel'` va antes que `'Azul'`.
    - `'destacados'`: primero los `featured`, y adentro de cada grupo se respeta el orden de entrada (estable).
    - El arreglo de entrada no se modifica.
  - `selectRelated`:
    - primero la misma línea (sin el propio producto) y después el mismo grupo de otras líneas, hasta 4;
    - nunca incluye otro grupo;
    - si hay menos disponibles, devuelve los que hay.
  - `options`: `LEATHERS` y `FERRULES` con los valores exactos y en ese orden; `isLeather('Rosa')` → `false`.

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- packages/domain`. Expected: FAIL (los módulos no existen).

- [ ] **Step 3: Implementar.**
  - `slugify` y `normalizeSearchText` usan `normalize('NFD')`, quitan `\p{Diacritic}` y pasan a minúsculas. `slugify` reemplaza `[^a-z0-9]+` por `-` y recorta los guiones de los extremos.
  - `sortProducts` copia el arreglo y usa un orden estable.

- [ ] **Step 4: Verificar.** Run: `npm test -- packages/domain` → PASS. Run: `npm run lint && npm run typecheck` → limpio.

- [ ] **Step 5: Commit** `feat(domain): reglas de catálogo, búsqueda, orden y relacionados`.

---

### Task 3: `domain` — carrito, kit y totales

**Files:**
- Create: `packages/domain/src/{cart.ts, kit.ts, totals.ts}`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/{cart.test.ts, kit.test.ts, totals.test.ts}`

**Interfaces:**
- Consumes: `Pesos`, `pesos`, `Leather`, `Ferrule`, `ProductGroup`, `maxQuantity` (Tasks 1–2).
- Produces:
  - `type ProductCartLine = { type: 'product'; productId: string; quantity: number; options?: { leather: Leather; ferrule: Ferrule } }`
  - `type KitCartLine = { type: 'kit'; mateId: string; bombillaId: string; yerbaId: string; leather: Leather; quantity: number }`
  - `type CartLine = ProductCartLine | KitCartLine`
  - `cartLineKey(line: CartLine): string`: `'product:{id}:{leather|-}:{ferrule|-}'` o `'kit:{mateId}:{bombillaId}:{yerbaId}:{leather}'`
  - `addCartLine(lines: readonly CartLine[], line: CartLine): CartLine[]` (suma cantidades si la clave coincide)
  - `setCartLineQuantity(lines, key: string, quantity: number): CartLine[]` (≤ 0 quita la línea)
  - `removeCartLine(lines, key: string): CartLine[]`
  - `quantityByProduct(lines): ReadonlyMap<string, number>` (cuenta también las piezas de los kits)
  - `remainingQuantityFor(productId: string, stock: number, lines: readonly CartLine[]): number`
  - `DEFAULT_KIT_DISCOUNT_PERCENT = 10`, `MAX_KIT_DISCOUNT_PERCENT = 30`
  - `kitSavings(piecesListTotal: Pesos, discountPercent: number): Pesos` (`RangeError` si el porcentaje no es un entero entre 0 y 30)
  - `KIT_GROUP_ORDER: readonly ProductGroup[] = ['mate','bombilla','yerba']`, `missingKitGroups(selection: Partial<Record<ProductGroup, string>>): ProductGroup[]`, `isKitComplete(selection): boolean`
  - `interface LineAmounts { grossArs: Pesos; savingsArs: Pesos; totalArs: Pesos }`
  - `productLineAmounts(unitPriceArs: Pesos, quantity: number): LineAmounts`
  - `kitLineAmounts(pieceListPrices: readonly [Pesos, Pesos, Pesos], quantity: number, discountPercent: number): LineAmounts`
  - `interface CartTotals { itemsGrossArs: Pesos; kitSavingsArs: Pesos; subtotalArs: Pesos; shippingArs: Pesos | null; totalArs: Pesos }`
  - `cartTotals(lines: readonly LineAmounts[], shippingArs: Pesos | null): CartTotals`

- [ ] **Step 1: Escribir los tests que fallan.** Usan los valores del spec (sección 8).
  - `kitLineAmounts([39999, 25999, 9999], 1, 10)` → `{ grossArs: 75997, savingsArs: 7600, totalArs: 68397 }`.
  - Con cantidad 2 → `{ 151994, 15200, 136794 }`.
  - `kitSavings(pesos(75997), 0)` → 0; con 31 → `RangeError`; con 10.5 → `RangeError`.
  - `cartTotals`: un mate de 39999 + ese kit, con envío de 6500 → `{ itemsGrossArs: 115996, kitSavingsArs: 7600, subtotalArs: 108396, shippingArs: 6500, totalArs: 114896 }`. Con envío `null` → `totalArs === subtotalArs`.
  - `addCartLine`:
    - el mismo producto con las mismas opciones dos veces da una sola línea con cantidad 2;
    - otro cuero da una línea aparte;
    - dos kits iguales con distinto cuero dan dos líneas.
  - `quantityByProduct` con un mate suelto ×1 y un kit con ese mate ×2 → el mate suma 3.
  - `remainingQuantityFor('m', 3, [mate ×1, kit con 'm' ×1])` → 1. Con `stock: 50` y nada en el carrito → 20.
  - `setCartLineQuantity(lines, key, 0)` quita la línea.
  - `missingKitGroups({ mate: 'x' })` → `['bombilla','yerba']`; `isKitComplete` con las tres piezas → `true`.

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- packages/domain`. Expected: FAIL.

- [ ] **Step 3: Implementar.** El ahorro del kit se calcula **por kit** y después se multiplica por la cantidad.

- [ ] **Step 4: Verificar.** Run: `npm test -- packages/domain && npm run lint && npm run typecheck` → PASS / limpio.

- [ ] **Step 5: Commit** `feat(domain): carrito, kit y totales del pedido`.

---

### Task 4: `domain` — envío, cuotas, impuestos, reseñas, fechas y pedidos

**Files:**
- Create: `packages/domain/src/{shipping.ts, installments.ts, tax.ts, ratings.ts, dates.ts, orders.ts}`
- Modify: `packages/domain/src/index.ts`, `packages/domain/README.md`
- Test: `packages/domain/src/{shipping,installments,tax,ratings,dates,orders}.test.ts`

**Interfaces:**
- Consumes: `Pesos`, `pesos` (Task 1).
- Produces:
  - `SHIPPING_METHODS = ['home','branch','pickup'] as const`, `type ShippingMethod`, `interface ShippingOption { method: ShippingMethod; label: string; costArs: Pesos; eta: string; enabled: boolean }`, `DEFAULT_SHIPPING_OPTIONS: readonly ShippingOption[]`, `type AddressField = 'street'|'number'|'apartment'|'postalCode'|'city'|'province'`, `ADDRESS_FIELDS_BY_METHOD: Readonly<Record<ShippingMethod, readonly AddressField[]>>`, `PROVINCES` (24, `as const`), `type Province`
  - `installmentAmount(total: Pesos, count: number): Pesos` (`Math.round(total / count)`; `RangeError` si `count` no es un entero ≥ 1), `formatPercentAr(value: number): string`
  - `netPrice(priceArs: Pesos, vatRatePercent: number): Pesos` (`round(price / (1 + rate/100))`; `RangeError` fuera de 0–100)
  - `averageRating(ratings: readonly number[]): number`, `formatRating(average: number): string`, `ratingDistribution(ratings: readonly number[]): readonly { stars: 1|2|3|4|5; count: number; percent: number }[]`, `STAR_WORDS = ['Malo','Regular','Bueno','Muy bueno','Excelente'] as const`, `pluralize(count: number, singular: string, plural: string): string`
  - `AR_TIME_ZONE = 'America/Argentina/Buenos_Aires'`, `formatMonthYear(iso: string): string`, `formatDate(iso: string): string`, `formatDateTime(iso: string): string`
  - `ORDER_STATUSES = ['pending_payment','paid','preparing','shipped','delivered','cancelled','expired','refunded'] as const`, `type OrderStatus`, `PAYMENT_STATUSES = ['none','pending','action_required','approved','rejected','cancelled','refunded','partially_refunded','in_dispute','charged_back'] as const`, `type PaymentStatus`, `PAYMENT_METHODS = ['mp_redirect','card'] as const`, `type PaymentMethod`, `ORDER_NUMBER_PATTERN = /^GLP-\d{5}$/`, `isOrderNumber(v: string): boolean`, `ORDER_RESERVATION_MINUTES = 30`

- [ ] **Step 1: Escribir los tests que fallan**
  - `DEFAULT_SHIPPING_OPTIONS` es exactamente:
    - `{ method:'home', label:'Envío a domicilio', costArs:6500, eta:'3 a 6 días hábiles', enabled:true }`
    - `{ method:'branch', label:'Envío a sucursal', costArs:4900, eta:'3 a 6 días hábiles', enabled:true }`
    - `{ method:'pickup', label:'Retiro en persona', costArs:0, eta:'Coordinamos por mail', enabled:true }`
  - `ADDRESS_FIELDS_BY_METHOD`:
    - `home` → `['street','number','apartment','postalCode','city','province']`
    - `branch` → `['postalCode','city','province']`
    - `pickup` → `[]`
  - `PROVINCES` tiene 24, con el texto exacto del diseño (`docs/design/galpon-tienda-v3/dc-script.js`, `PROVS`); incluye `'CABA'` y `'Tierra del Fuego'`.
  - `installmentAmount(pesos(39999), 3)` → 13333; `(pesos(68397), 3)` → 22799; con `count` 0 → `RangeError`.
  - `formatPercentAr(0)` → `'0,00 %'`; `(45.9)` → `'45,90 %'`.
  - `netPrice(pesos(12100), 21)` → 10000; `(pesos(39999), 21)` → 33057.
  - `averageRating([])` → 0. `formatRating(averageRating([5,5,4]))` → `'4,7'`. `ratingDistribution([5,5,4])` → `[{stars:5,count:2,percent:67},{stars:4,count:1,percent:33},{stars:3,count:0,percent:0},{stars:2,…},{stars:1,…}]`.
  - `pluralize(1,'reseña','reseñas')` → `'1 reseña'`; con 0 → `'0 reseñas'`.
  - `formatMonthYear`: `'2026-09-15T15:00:00Z'` → `'Sep 2026'`; **`'2026-09-01T02:00:00Z'` → `'Ago 2026'`** (Review Focus 1).
  - `formatDateTime('2026-10-19T17:05:00Z')` → `'19/10/2026 14:05'`; `formatDate('2026-10-19T02:00:00Z')` → `'18/10/2026'`.
  - `isOrderNumber`: `'GLP-12345'` → `true`; `'GLP-1234'` y `'glp-12345'` → `false`.

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- packages/domain`. Expected: FAIL.

- [ ] **Step 3: Implementar.**
  - Las fechas usan `Intl.DateTimeFormat('es-AR', { timeZone: AR_TIME_ZONE, … })` con `formatToParts`.
  - `formatMonthYear` toma el número de mes de esas partes y lo traduce con el arreglo del diseño: `['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']`.

- [ ] **Step 4: Verificar con cobertura.** Run: `npm run test:coverage`. Expected: PASS y se cumplen los umbrales de `packages/domain/src/**`. Completar el README de `domain` con la tabla de módulos.

- [ ] **Step 5: Commit** `feat(domain): envío, cuotas, impuestos, reseñas, fechas y estados de pedido`.

---

### Task 5: `schemas` — mensajes, campos comunes y checkout

**Files:**
- Create: `packages/schemas/{package.json, tsconfig.json, README.md}`, `packages/schemas/src/{index.ts, messages.ts, fields.ts, checkout.ts, form-errors.ts}`
- Test: `packages/schemas/src/{fields.test.ts, checkout.test.ts, form-errors.test.ts}`

**Interfaces:**
- Consumes: `PROVINCES`, `Province`, `ORDER_NUMBER_PATTERN`, `ShippingMethod` (Task 4).
- Produces (`package.json`: `"name": "@galpon/schemas"`, dependencias `zod` y `@galpon/domain`):
  - `MESSAGES`: objeto `as const` con todos los textos de error de la sección 15 del spec. Los que necesitan un número son funciones: `max: (n: number) => \`Máximo ${n} caracteres\``, `minLetters: 'Ingresá al menos 2 letras'`.
  - `emailSchema` (trim + minúsculas), `personNameSchema`, `optionalPhoneSchema` (salida: 10 dígitos o `undefined`), `streetSchema`, `streetNumberSchema` (`'s/n'` → `'S/N'`), `apartmentSchema`, `postalCodeSchema` (mayúsculas), `citySchema`, `provinceSchema`, `dniSchema` (quita puntos y espacios), `orderNumberSchema` (trim + mayúsculas), `honeypotSchema` (`z.string().max(0).optional()`), `quantitySchema(max: number)`
  - `checkoutContactSchema` `{ email, firstName, lastName, phone? }`
  - `homeAddressSchema` `{ street, number, apartment?, postalCode, city, province }` y `branchAddressSchema` `{ postalCode, city, province }`
  - `shippingSchema`: `z.discriminatedUnion('method', [{ method:'home', address: homeAddressSchema }, { method:'branch', address: branchAddressSchema }, { method:'pickup' }])`
  - `cardholderSchema` `{ cardholderName, identificationType, identificationNumber }`. Si el tipo es `'DNI'` aplica la regla de DNI; con otro tipo, 5–20 caracteres alfanuméricos.
  - `type CheckoutContactInput = z.input<typeof checkoutContactSchema>` y `type CheckoutContact = z.output<…>` (mismo patrón para cada schema)
  - `toFieldErrors(error: z.ZodError): Record<string, string>` (path unido con `.`; gana el primer mensaje)

- [ ] **Step 1: Escribir los tests que fallan.** Cada regla tiene casos válidos e inválidos, con el mensaje exacto.
  - **email**: `' Vos@Ejemplo.com '` → `'vos@ejemplo.com'`; `'vos@'` → "Ingresá un email válido".
  - **personName**:
    - `''` → "Requerido"
    - `'A'` → "Ingresá al menos 2 letras"
    - `'R2D2'` → "Usá solo letras"
    - 51 letras → "Máximo 50 caracteres"
    - son válidos `'Lucía'`, `"O'Connor"` y `'María-José'`.
  - **phone**:
    - `''` → `undefined`
    - `'11 2345-6789'` → `'1123456789'`
    - `'+54 9 11 2345 6789'` → `'1123456789'`
    - `'011 2345 6789'` y `'11 15 2345 6789'` → "Ingresá el código de área y el número, sin 0 ni 15"
  - **postalCode**: `'1414'` es válido; `'c1414abc'` → `'C1414ABC'`; `'14'` y `'C1414ABCD'` → "Código postal inválido".
  - **streetNumber**: `''` → "Requerido"; `'s/n'` → `'S/N'`; `'123456'` → "Ingresá el número o S/N".
  - **province**: `'CABA'` es válida; `'Narnia'` → "Elegí una provincia".
  - **dni**: `'12.345.678'` → `'12345678'`; `'123456'` → "DNI inválido".
  - **shipping**: `pickup` sin dirección es válido; `branch` sin `postalCode` da error en `address.postalCode`; `home` sin calle da `'address.street': 'Requerido'`.
  - **cardholder**: DNI inválido → "DNI inválido"; nombre vacío → "Como figura en la tarjeta".
  - **toFieldErrors** devuelve `{ 'address.street': 'Requerido', … }`.

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- packages/schemas`. Expected: FAIL.

- [ ] **Step 3: Implementar** con Zod 4:
  - Mensajes como string (`.min(2, MESSAGES.minLetters)`) o `{ error }`. No usar `message`: está deprecado.
  - Usar `z.email()` (no `z.string().email()`) y `.trim()`.
  - El teléfono se normaliza en un `.transform`: quitar todo lo que no sea dígito y después el prefijo `54` / `549`. El resultado tiene que tener 10 dígitos y no empezar con 0.

- [ ] **Step 4: Verificar.** Run: `npm test -- packages/schemas && npm run lint && npm run typecheck` → PASS.

- [ ] **Step 5: Commit** `feat(schemas): campos comunes y validaciones del checkout`.

---

### Task 6: `schemas` — reseñas, contacto, arrepentimiento, cuenta y admin

**Files:**
- Create: `packages/schemas/src/{review.ts, contact.ts, withdrawal.ts, account.ts, admin.ts}`
- Modify: `packages/schemas/src/index.ts`, `packages/schemas/README.md`
- Test: `packages/schemas/src/{review,contact,withdrawal,account,admin}.test.ts`

**Interfaces:**
- Consumes: Task 5 (campos, `MESSAGES`), `PRODUCT_GROUPS`, `PRODUCT_STATUSES`, `SHIPPING_METHODS`, `MAX_KIT_DISCOUNT_PERCENT` (Tasks 2–4).
- Produces:
  - `reviewSchema` `{ rating, authorName (opcional ≤ 40; si viene vacío, la salida es 'Anónimo'), text (10–600), website }`
  - `CONTACT_REASONS = ['Pedido','Envío','Cambio','Arrepentimiento','Otro'] as const`, `type ContactReason`, `contactSchema` `{ name, email, orderNumber?, reason, message, website }`
  - `withdrawalSchema` `{ name: personName, email, orderNumber?, comment? (≤ 2000), website }`
  - `passwordSchema`, `registerSchema` `{ email, firstName, lastName, password }`, `loginSchema` `{ email, password }`, `forgotPasswordSchema` `{ email }`, `resetPasswordSchema` `{ token, password, passwordConfirmation }`, `addressBookEntrySchema` `{ label? (≤ 30), …homeAddress, isDefault }`
  - `adminLoginSchema` `{ email, password }`, `cuitSchema` (acepta `20-12345678-6` o solo dígitos; salida: 11 dígitos)
  - `productFormSchema` `{ name 3–120, slug, categoryId, description 10–2000, priceArs: int > 0 | null, stock int 0–9999, featured, status: 'draft'|'published', tabsOverride?: { materials?, care? } (≤ 2000 cada uno), images ≤ 8 de { publicId, width, height, alt 3–120 } }`
  - `categoryFormSchema` `{ name 2–60, slug, group, blurb ≤ 200, image: imagen | null }`
  - `settingsFormSchema` `{ kitDiscountPercent 0–30, shippingOptions: exactamente 3 (uno por método, costArs ≥ 0, eta 2–60, enabled), installments: { maxWithoutInterest 1–12, showOnProduct }, contactEmail, lowStockThreshold 0–999, vatRatePercent 0–100, priceDisplay: { showNetPrice }, seller: { legalName, cuit, taxCondition, address, phone, supportArea, supportHours, dataFiscalUrl } }`. Cada campo de `seller` es `string | null`; `cuit` usa `cuitSchema` y `dataFiscalUrl` es una URL.
  - `dispatchSchema` `{ carrier 2–40, trackingNumber 4–40 }`, `adminPasswordChangeSchema` `{ currentPassword, newPassword: passwordSchema, confirmation }`

- [ ] **Step 1: Escribir los tests que fallan.** Los mensajes son exactos y salen de la sección 15 del spec.
  - **reseña**: `rating: 0` → "Elegí una puntuación de 1 a 5 estrellas."; texto de 9 caracteres → "Contanos un poco más (mínimo 10 caracteres)"; `authorName: ''` → la salida es `'Anónimo'`.
  - **contacto**: nombre vacío → "Contanos tu nombre"; mensaje corto → "Escribí al menos 10 caracteres"; `orderNumber: 'GLP-123'` → "El número tiene el formato GLP-12345"; un motivo que no está en la lista es inválido.
  - **arrepentimiento**: sin `orderNumber` es válido (Disp. 954/2025: no se exigen datos extra).
  - **contraseña**: `'abcdefghij'` (sin números) → "Mínimo 10 caracteres, con letras y números"; `'abcdefghi1'` es válida.
  - **resetPassword**: confirmación distinta → error en `passwordConfirmation` "Las contraseñas no coinciden".
  - **cuit**: `'20-12345678-6'` → `'20123456786'`; `'20-12345678-5'` → "CUIT inválido".
  - **producto**:
    - slug `'Mate Imperial'` → "Solo minúsculas, números y guiones"
    - 9 imágenes → error
    - `priceArs: 0` → error; `priceArs: null` es válido
  - **ajustes**:
    - `kitDiscountPercent: 31` → error
    - 2 opciones de envío → error
    - un `seller` con todo en `null` es válido
  - **despacho**: carrier `'A'` → error.

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- packages/schemas`. Expected: FAIL.

- [ ] **Step 3: Implementar.**
  - Dígito verificador del CUIT: pesos `[5,4,3,2,7,6,5,4,3,2]` sobre los primeros 10 dígitos, `v = 11 − (suma % 11)`; si `v` es 11 vale 0 y si es 10 el CUIT es inválido.
  - Las confirmaciones usan `.refine(…, { error, path })`.

- [ ] **Step 4: Verificar con cobertura.** Run: `npm run test:coverage`. Expected: PASS y se cumplen los umbrales de `packages/schemas/src/**`. El README de `schemas` lista los schemas y la convención de mensajes.

- [ ] **Step 5: Commit** `feat(schemas): reseñas, contacto, arrepentimiento, cuenta y formularios del admin`.

---

### Task 7: `design-tokens` — tema de Tailwind y estilos base

**Files:**
- Create: `packages/design-tokens/{package.json, tsconfig.json, README.md, tokens.css, base.css}`, `packages/design-tokens/src/tokens.ts`
- Test: `packages/design-tokens/src/tokens.test.ts`

**Interfaces:**
- Consumes: `Leather` (Task 2).
- Produces:
  - `package.json`: `"name": "@galpon/design-tokens"`, `"exports": { ".": "./src/tokens.ts", "./tokens.css": "./tokens.css", "./base.css": "./base.css" }`.
  - `tokens` (objeto `as const`) con:
    - `colors`: `background`, `surface`, `foreground`, `accent`, `accent2`, `neutral`, `section`, `sectionGlow`, `sectionGhost`, `cream`, `danger: { text, border }`, `divider`
    - `shadows`, `radii`, `space`, `typography`
    - `leathersUi: Record<Leather, string>`, `leathers3d: Record<Leather, string>`
    - `easing: { main, spring }`, `durations: { reveal: 1000 }`
  - `cssVariables(): Readonly<Record<string, string>>`: el nombre de cada variable CSS de `@theme` con su valor.
  - Utilidades de Tailwind que quedan disponibles:
    - colores: `bg-background`, `bg-surface`, `text-foreground`, `text-accent`, `bg-accent-500`, `bg-accent-2-500`, `text-neutral-400`, `bg-section`, `bg-cream`, `text-danger`, `border-danger-border`
    - `rounded-sm|md|lg|tag`, `shadow-sm|md|lg`
    - `text-body|h1|h2|h3|h4|h5`
    - `ease-main`, `ease-spring`, `font-sans`

- [ ] **Step 1: Escribir el test que falla.** Lee `tokens.css` con `fs` y extrae las declaraciones `--nombre: valor;`.
  - Cada par de `cssVariables()` aparece en el CSS con el mismo valor.
  - Valores puntuales: `--color-background: #1a1210`, `--color-accent-500: #c0803f`, `--color-accent-2-500: #8ba43f`, `--radius-lg: 14px`, `--ease-spring: cubic-bezier(.34,1.56,.64,1)`.
  - `tokens.leathersUi.Borravino === '#5d1f2d'`.
  - `tokens.leathers3d.Crudo === '#b88d5c'`.

- [ ] **Step 2: Correr y ver que falla.** Run: `npm test -- packages/design-tokens`. Expected: FAIL.

- [ ] **Step 3: Escribir `tokens.ts`, `tokens.css` y `base.css`.** Todos los valores salen de la sección 7 del spec.
  - `tokens.css` es un solo bloque `@theme` que arranca con `--color-*: initial;`, para borrar la paleta por defecto de Tailwind.
  - Colores: `--color-background`, `--color-surface`, `--color-foreground`, `--color-accent` (el 500), `--color-accent-100`…`900`, `--color-accent-2-100`…`900`, `--color-neutral-100`…`900`, `--color-section`, `--color-section-glow`, `--color-section-ghost`, `--color-cream`, `--color-danger` (el de texto), `--color-danger-border`, `--color-divider`.
  - Además: `--radius-sm|md|lg|tag`, `--shadow-sm|md|lg`, `--font-sans: var(--font-inter), 'Inter Variable', system-ui, sans-serif`, `--ease-main`, `--ease-spring`.
  - Tipografía: `--text-body: 15px` con `--text-body--line-height: 1.55`, y de `--text-h1` a `--text-h5` con `--text-hN--line-height: 1.12`, `--text-hN--letter-spacing: -0.015em` y `--text-hN--font-weight: 500`.
  - Los espacios del diseño (2,8 px × n) **no** reemplazan la escala de Tailwind: van como variables `--space-1…8` en `:root`, dentro de `base.css`.
  - `base.css` va en `@layer base`:
    - `html` con `color-scheme: dark`
    - `body` con fondo, color y `font-family`, 15px / 1.55
    - títulos `h1`–`h5` con sus tamaños
    - `:focus-visible` con contorno de 2px `accent` y separación de 2px
    - `::selection` con el `accent` al 30%
    - las variables `--space-*`
  - README: cómo se importan desde Next y desde Vite, y por qué hay dos paletas de cuero.

- [ ] **Step 4: Verificar.** Run: `npm test -- packages/design-tokens && npm run lint && npm run typecheck` → PASS.

- [ ] **Step 5: Commit** `feat(design-tokens): tema de Tailwind v4 y estilos base del diseño`.

---

### Task 8: Contrato OpenAPI — base y lecturas públicas

**Files:**
- Create: `docs/api/openapi.yaml`, `docs/api/README.md`, `redocly.yaml`

**Interfaces:**
- Consumes: los valores de los enums de `domain` (Tasks 2 y 4), copiados literalmente.
- Produces (los nombres de schemas son los tipos que genera la Task 10):
  - **Raíz**:
    - `openapi: 3.1.0`
    - `info.title: Galpón Mates API`, `info.version: 1.0.0`
    - `servers: [{ url: https://api.galponmates.com.ar/api/v1 }]` (las rutas son relativas a ese prefijo)
    - `tags`: `catalog`, `reviews`, `content`, `settings`, `cart`, `orders`, `payments`, `contact`, `account`, `admin`
    - Cada operación lleva `operationId` en camelCase, `summary` en español, `tags` y `responses`.
  - `components.securitySchemes`: `customerSession` (apiKey en la cookie `__Host-galpon_session`), `adminSession` (cookie `__Host-galpon_admin`), `csrfToken` (header `X-CSRF-Token`), `orderToken` (header `X-Order-Token`). CSRF y token de pedido van como **esquema de seguridad, no como parámetro**: así los inyecta el middleware y openapi-fetch no los exige en cada llamada.
  - `components.parameters`: `Page` (query, int ≥ 1, por defecto 1), `PageSize` (int 1–100, por defecto 24), `ProductSlug` (path, patrón de slug), `IdempotencyKey` (header `Idempotency-Key`, requerido, `format: uuid`).
  - `components.responses`: `ValidationError` (422), `Unauthorized` (401), `Forbidden` (403), `NotFound` (404), `Conflict` (409), `RateLimited` (429, header `Retry-After`), `ServerError` (500). Todas con `application/problem+json` y `$ref: Problem`.
  - **Schemas de esta tarea**:
    - Problemas y montos: `Problem { type, title, status, detail?, instance?, errors?: FieldError[], changes?: ChangeNotice[] }`, `FieldError { field, code, message }`, `ChangeNotice { kind: 'price'|'stock'|'discount'|'shipping'|'unavailable', productId: string | null, message }`, `Pesos` (integer ≥ 0), `NullablePesos` (`type: [integer, 'null']`, `minimum: 0`).
    - Enums: `ProductGroup`, `Leather`, `Ferrule`, `ProductSortOrder`, `ShippingMethod`.
    - Catálogo:
      - `Image { publicId, url, width, height, alt }`
      - `Category { id, slug, name, group, blurb, image: Image | null, position, productCount }`
      - `Rating { average, count }`
      - `ProductSummary { id, slug, code, name, description, categoryId, categorySlug, categoryName, group, priceArs: NullablePesos, netPriceArs: NullablePesos, isPurchasable, isSoldOut, maxQuantity, featured, mainImage: Image | null, rating: Rating }`
      - `ProductTabs { descriptionNote: string | null, materials, shipping, care }`
      - `ProductOptions { leathers: Leather[], ferrules: Ferrule[] }`
      - `ProductDetail` (`allOf`: `ProductSummary` + `{ images: Image[], tabs: ProductTabs, options: ProductOptions | null }`)
      - `ProductPage { items, page, pageSize, total }`
    - Reseñas:
      - `Review { id, authorName, rating, text, createdAt (date-time), verifiedPurchase }`
      - `ReviewStats { average, count, distribution: { stars, count, percent }[] }`
      - `ReviewPage { items, page, pageSize, total, stats }`
      - `FeaturedReview` (`Review` + `product: { slug, name }`)
    - Ajustes:
      - `ShippingOption`
      - `PublicSettings { kitDiscountPercent, shippingOptions, installments: { maxWithoutInterest, showOnProduct }, contactEmail, priceDisplay: { showNetPrice }, seller }`. En `seller`, cada campo de la sección 6 de la Task 6 es `string | null`.
    - Contenidos:
      - `HomeContent`:
        - `hero { eyebrow, titleLines: string[], text, primaryCtaLabel, secondaryCtaLabel }`
        - `scenes`: 6 de `StoryScene { key: 'pieces'|'gourd'|'bombilla'|'yerba'|'ritual'|'leather', eyebrow, titleLines, text, ctaLabel: string | null }`
        - `ritualSteps: string[4]`
        - `storyProducts { hero, bombillas: [slug, slug], yerbas: [slug, slug, slug] }`
        - `collection`, `featured` y `reviews` como `SectionHeading { eyebrow, title }`
        - `manifesto { eyebrow, text, ctaLabel }`
        - `stats { provinces, partners }`
        - `kitBlock { eyebrow, title, text, ctaLabel }`
      - `AboutContent { hero: { eyebrow, titleLines, text }, partners: { name, role, photo: Image | null }[], quote, stepsEyebrow, steps: { title, text }[], ctaLabel }`
      - `FaqContent { categories: { id, label, items: { question, answer }[] }[] }`
      - `FooterContent { tagline, text, paymentMethods: string[], consumerDefenseUrl: string | null }`
      - `ProductTabsContent { mate, bombilla, yerba }`, cada uno `{ descriptionNote: string | null, materialsTitle, materials, careTitle, care }`, más `shipping`
      - `LegalContent { title, updatedAt (date), body }` (párrafos separados por línea en blanco)
- **Paths de esta tarea** (todos `GET`, públicos, sin seguridad):

| Path | operationId | 200 | Errores |
|---|---|---|---|
| `/categories` | `listCategories` | `Category[]` | 500 |
| `/products` (query: `category`, `group`, `ids` (CSV), `q`, `sort`, `featured`, `page`, `pageSize`) | `listProducts` | `ProductPage` | 422, 500 |
| `/products/{slug}` | `getProduct` | `ProductDetail` (con slug viejo, el producto con su slug actual) | 404 |
| `/products/{slug}/related` | `listRelatedProducts` | `ProductSummary[]` | 404 |
| `/products/{slug}/reviews` (query: `page`) | `listProductReviews` | `ReviewPage` | 404 |
| `/reviews/featured` | `listFeaturedReviews` | `FeaturedReview[]` | 500 |
| `/content/home` · `/content/about` · `/content/faq` · `/content/footer` · `/content/product-tabs` | `getHomeContent` · `getAboutContent` · `getFaqContent` · `getFooterContent` · `getProductTabsContent` | el schema de cada uno | 500 |
| `/content/legal/{document}` (`terms` \| `privacy`) | `getLegalContent` | `LegalContent` | 404 |
| `/settings/public` | `getPublicSettings` | `PublicSettings` | 500 |

- [ ] **Step 1: Escribir `redocly.yaml`** con `extends: [recommended]` y sin ninguna regla apagada. Si una regla molesta, se arregla el YAML: no se apaga la regla.

- [ ] **Step 2: Escribir `docs/api/openapi.yaml`** con todo lo anterior. Cada schema y propiedad lleva `description` en español. Los nulos se escriben con `type: [X, 'null']`. Las listas de enums son idénticas a las de `domain`.

- [ ] **Step 3: Validar.** Run: `npm run api:lint`. Expected: exit 0 y 0 errores.

- [ ] **Step 4: Escribir `docs/api/README.md`**: qué es el contrato, sus convenciones (sección 12 del spec), cómo se valida (`npm run api:lint`) y se generan los tipos (`npm run api:generate`), y la regla de cambiar el contrato en el repo del front y en el del back en el mismo cambio funcional.

- [ ] **Step 5: Commit** `docs(api): contrato OpenAPI — base y lecturas públicas`.

---

### Task 9: Contrato OpenAPI — carrito, pedidos, pagos, contacto, arrepentimiento y cuenta

**Files:**
- Modify: `docs/api/openapi.yaml`

**Interfaces:**
- Consumes: componentes de la Task 8; `ORDER_STATUSES`, `PAYMENT_STATUSES`, `PAYMENT_METHODS`, `PROVINCES` (Task 4); `CONTACT_REASONS` (Task 6).
- Produces:
  - **Enums**: `OrderStatus`, `PaymentStatus`, `PaymentMethod`, `Province`, `ContactReason`.
  - **Carrito**:
    - `CartItemInput`: `oneOf` con `discriminator: { propertyName: type }` entre `ProductCartItemInput { type: 'product', productId, quantity (1–20), options: { leather, ferrule } | null }` y `KitCartItemInput { type: 'kit', mateId, bombillaId, yerbaId, leather, quantity }`
    - `CartQuote { lines: CartQuoteLine[], itemsGrossArs, kitSavingsArs, subtotalArs }`
    - `CartQuoteLine { key, type, name, detail, unitPriceArs, kitSavingsArs, totalArs, maxQuantity, issue: 'unavailable'|'sold_out'|'quantity_reduced'|'price_changed'|null }`
  - **Pedido de entrada**:
    - `CustomerInput { email, firstName, lastName, phone: string | null }`
    - `AddressInput { street, number, apartment: string | null, postalCode, city, province }`
    - `ShippingInput { method, address: AddressInput | null }`
    - `CreateOrderInput { customer, shipping, items, paymentMethod, expectedTotalArs, website: string | null }`
  - **Pedido** (`ChangeNotice` ya existe desde la Task 8):
    - `OrderLine { type, name, detail, quantity, unitPriceArs, kitSavingsArs, totalArs, productSlug: string | null, options, kitItems: { slug, name, unitPriceArs }[] | null }`
    - `OrderPayment { method, installments, paymentTypeId, lastFour, statusDetail, mpPaymentId }` (todos nullables salvo `method`)
    - `OrderTracking { carrier, number }`, `OrderHistoryEntry { status, at, note: string | null }`
    - `Order` (campos de la sección 12 del spec, `tracking: OrderTracking | null`)
    - `CreateOrderResult { order, orderToken }`
    - `OrderSummary { number, createdAt, status, paymentStatus, totalArs, itemCount }` + `OrderSummaryPage`
  - **Pagos**:
    - `MercadoPagoPreference { initPoint (uri) }`
    - `CardPaymentInput { token, paymentMethodId, issuerId: string | null, installments (≥ 1), payer: { email, identification: { type, number } } }`
    - `CardPaymentResult { paymentStatus, statusDetail, challenge: { url } | null }`
  - **Formularios públicos**:
    - `ReviewInput { rating, authorName: string | null, text, website: string | null }`
    - `ContactInput { name, email, orderNumber: string | null, reason, message, website: string | null }`
    - `WithdrawalInput { name, email, orderNumber: string | null, comment: string | null, website: string | null }`, `WithdrawalReceipt { code }`
  - **Cuenta de cliente**:
    - `Customer { email, firstName, lastName, phone: string | null }`, `CustomerUpdate`
    - `Address { id, label: string | null, street, number, apartment, postalCode, city, province, isDefault }`, `AddressBookInput`
    - `RegisterInput`, `LoginInput`, `ForgotPasswordInput`, `ResetPasswordInput`, `CsrfToken { csrfToken }`
- **Paths**:

| Método y path | operationId | Seguridad | Éxito | Errores |
|---|---|---|---|---|
| `POST /products/{slug}/reviews` | `createReview` | — | 202 `{ status: 'pending' }` | 404, 422, 429 |
| `POST /cart/quote` | `quoteCart` | — | 200 `CartQuote` | 422 |
| `POST /shipping/quote` (`{ method, postalCode: string \| null, items }`) | `quoteShipping` | — | 200 `{ method, costArs, eta }` | 422 |
| `POST /orders` (+ `IdempotencyKey`) | `createOrder` | — | 201 `CreateOrderResult` | 409 (`type`: `stock_changed`/`price_changed`/`total_changed`, con `changes`), 422, 429 |
| `GET /orders/{number}` | `getOrder` | `orderToken` o `customerSession` | 200 `Order` | 404 |
| `POST /orders/{number}/payments/mercadopago/preference` (+ `IdempotencyKey`) | `createMercadoPagoPreference` | `orderToken` | 200 `MercadoPagoPreference` | 404, 409 (pedido pagado o vencido) |
| `POST /orders/{number}/payments/mercadopago/card` (+ `IdempotencyKey`) | `payWithCard` | `orderToken` | 200 `CardPaymentResult` | 404, 409, 422 |
| `POST /contact` | `sendContactMessage` | — | 202 | 422, 429 |
| `POST /withdrawals` | `requestWithdrawal` | — | 201 `WithdrawalReceipt` | 422, 429 |
| `POST /webhooks/mercadopago` (header `x-signature`, `x-request-id`) | `receiveMercadoPagoWebhook` | — | 200 | 401 |
| `GET /auth/csrf` | `getCustomerCsrfToken` | — | 200 `CsrfToken` | — |
| `POST /auth/register` | `registerCustomer` | `csrfToken` | 201 `Customer` | 409 (email existente), 422 |
| `POST /auth/login` | `loginCustomer` | `csrfToken` | 200 `Customer` | 401, 422, 429 |
| `POST /auth/logout` | `logoutCustomer` | `customerSession` + `csrfToken` | 204 | 401 |
| `POST /auth/password/forgot` | `requestPasswordReset` | `csrfToken` | 202 | 422, 429 |
| `POST /auth/password/reset` | `resetPassword` | `csrfToken` | 204 | 422 |
| `GET /me` · `PATCH /me` | `getMe` · `updateMe` | `customerSession` (+ `csrfToken` en el PATCH) | 200 `Customer` | 401, 422 |
| `GET /me/orders` (`page`) · `GET /me/orders/{number}` | `listMyOrders` · `getMyOrder` | `customerSession` | `OrderSummaryPage` · `Order` | 401, 404 |
| `GET /me/addresses` · `POST /me/addresses` | `listMyAddresses` · `createMyAddress` | `customerSession` (+ `csrfToken` en el POST) | `Address[]` · 201 `Address` | 401, 422 |
| `PATCH /me/addresses/{id}` · `DELETE /me/addresses/{id}` | `updateMyAddress` · `deleteMyAddress` | `customerSession` + `csrfToken` | `Address` · 204 | 401, 404, 422 |

- [ ] **Step 1: Agregar al YAML los schemas y paths de esta tarea.** La `description` de cada pago explica la idempotencia, el "un intento activo por pedido" y que el estado definitivo llega por webhook (sección 14 del spec).
- [ ] **Step 2: Validar.** Run: `npm run api:lint`. Expected: exit 0 y 0 errores.
- [ ] **Step 3: Commit** `docs(api): contrato de carrito, pedidos, pagos, contacto, arrepentimiento y cuenta`.

---

### Task 10: Contrato OpenAPI — admin, generación de tipos y alineación con `domain`

**Files:**
- Modify: `docs/api/openapi.yaml`
- Create: `packages/api-client/{package.json, tsconfig.json, README.md}`, `packages/api-client/src/generated/schema.d.ts` (generado), `packages/api-client/src/contract-alignment.ts`

**Interfaces:**
- Consumes: Tasks 8–9; enums de `domain`; `CONTACT_REASONS` (Task 6).
- Produces:
  - **Sesión y resumen**:
    - `AdminLoginInput { email, password }`, `AdminLoginResult { email, csrfToken, expiresAt }`, `AdminSession { email, expiresAt }`, `AdminPasswordChange`
    - `DashboardSummary { salesTodayArs, salesLast7DaysArs, ordersToShip, lowStock: { id, name, stock }[], pendingReviews, unreadMessages, paymentAlerts: { orderNumber, kind: 'charged_back'|'in_dispute'|'duplicate_payment', message }[] }`
  - **Productos y líneas**:
    - `AdminProduct` (todo lo de `ProductDetail` + `status`, `stock`, `sequence`, `tabsOverride: { materials, care } | null`, `previousSlugs`, `createdAt`, `updatedAt`), `AdminProductInput`, `AdminProductPage`
    - `CategoryInput`, `CategoryOrderInput { ids }`
  - **Fotos**: `MediaSignatureInput { purpose: 'product'|'category'|'partner'|'site' }`, `MediaSignature { timestamp, signature, apiKey, cloudName, folder }`.
  - **Pedidos**: `AdminOrderPage`, `OrderStatusChange { status: 'preparing'|'shipped'|'delivered'|'cancelled', carrier: string | null, trackingNumber: string | null, note: string | null }`.
  - **Ajustes**: `AdminSettings` (`PublicSettings` + `lowStockThreshold`, `vatRatePercent`).
  - **Reseñas y mensajes**:
    - `AdminReview` (`Review` + `status: 'pending'|'approved'|'hidden'`, `featured`, `product: { slug, name }`), `AdminReviewPage`, `AdminReviewUpdate { status?, featured? }`
    - `ContactMessage { id, kind: 'contact'|'withdrawal', name, email, orderNumber, reason, message, code, createdAt, read }`, `ContactMessagePage`, `ContactMessageUpdate { read }`
  - `@galpon/api-client` (`package.json`):
    - `"exports": { ".": "./src/index.ts", "./react": "./src/react/index.ts", "./mock": "./src/mock/index.ts" }`
    - scripts `api:generate` = `npx --yes openapi-typescript@7.13.0 ../../docs/api/openapi.yaml -o src/generated/schema.d.ts --root-types --root-types-no-schema-prefix --alphabetize`, `api:check` = lo mismo + `--check`, y `typecheck` = `tsc --noEmit`
    - dependencias `openapi-fetch`, `@galpon/domain`, `@galpon/schemas`, `zod`; peerDependencies `react` y `@tanstack/react-query`
    - `tsconfig.json`: extiende `tsconfig.react.json`
- **Paths del admin** (todos con seguridad `adminSession`; los que no son `GET` llevan además `csrfToken`, salvo el login):

| Método y path | operationId | Éxito |
|---|---|---|
| `POST /admin/auth/login` | `adminLogin` | 200 `AdminLoginResult` (401, 422, 429) |
| `POST /admin/auth/logout` | `adminLogout` | 204 |
| `GET /admin/auth/me` | `getAdminSession` | 200 `AdminSession` |
| `GET /admin/auth/csrf` | `getAdminCsrfToken` | 200 `CsrfToken` |
| `POST /admin/auth/password` | `changeAdminPassword` | 204 (422) |
| `GET /admin/dashboard/summary` | `getDashboardSummary` | 200 `DashboardSummary` |
| `GET /admin/products` (`q`, `category`, `status`, `stock=out`, `sort`, `page`, `pageSize`) · `POST /admin/products` | `listAdminProducts` · `createAdminProduct` | `AdminProductPage` · 201 `AdminProduct` (409 slug, 422) |
| `GET /admin/products/{id}` · `PATCH /admin/products/{id}` | `getAdminProduct` · `updateAdminProduct` | `AdminProduct` (404, 409, 422) |
| `POST /admin/products/{id}/archive` | `archiveAdminProduct` | 200 `AdminProduct` |
| `GET /admin/categories` · `POST /admin/categories` | `listAdminCategories` · `createAdminCategory` | `Category[]` · 201 `Category` |
| `PATCH /admin/categories/{id}` · `DELETE /admin/categories/{id}` | `updateAdminCategory` · `deleteAdminCategory` | `Category` · 204 (409 si tiene productos) |
| `PUT /admin/categories/order` | `reorderAdminCategories` | 204 |
| `POST /admin/media/signature` | `createMediaSignature` | 200 `MediaSignature` |
| `GET /admin/orders` (`status`, `paymentStatus`, `q`, `page`) · `GET /admin/orders/{number}` | `listAdminOrders` · `getAdminOrder` | `AdminOrderPage` · `Order` |
| `POST /admin/orders/{number}/status` | `changeOrderStatus` | 200 `Order` (409 transición inválida, 422) |
| `GET`/`PUT` `/admin/content/home` · `about` · `faq` · `footer` · `product-tabs` · `legal/{document}` | `getAdmin…Content` / `updateAdmin…Content` | el schema de cada contenido |
| `GET /admin/settings` · `PUT /admin/settings` | `getAdminSettings` · `updateAdminSettings` | `AdminSettings` (422) |
| `GET /admin/reviews` (`status`, `page`) · `PATCH /admin/reviews/{id}` | `listAdminReviews` · `updateAdminReview` | `AdminReviewPage` · `AdminReview` |
| `GET /admin/messages` (`kind`, `read`, `page`) · `PATCH /admin/messages/{id}` | `listAdminMessages` · `updateAdminMessage` | `ContactMessagePage` · `ContactMessage` |

- [ ] **Step 1: Agregar al YAML los schemas y paths del admin.** Run: `npm run api:lint`. Expected: 0 errores.
- [ ] **Step 2: Crear el paquete `api-client` y generar los tipos.** Run: `npm install && npm run api:generate`. Expected: se crea `src/generated/schema.d.ts`, que exporta `paths`, `components`, `operations` y los tipos raíz (`Category`, `ProductSummary`, `Order`…).
- [ ] **Step 3: Escribir `src/contract-alignment.ts`.** Son solo aserciones de tipos, sin código en runtime:

```ts
import type * as Domain from '@galpon/domain'
import type { ContactReason as SchemaContactReason } from '@galpon/schemas'
import type { components } from './generated/schema'

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T
type S = components['schemas']

export type ContractAlignment = [
  Assert<Equals<S['ProductGroup'], Domain.ProductGroup>>,
  Assert<Equals<S['Leather'], Domain.Leather>>,
  Assert<Equals<S['Ferrule'], Domain.Ferrule>>,
  Assert<Equals<S['ProductSortOrder'], Domain.ProductSortOrder>>,
  Assert<Equals<S['ShippingMethod'], Domain.ShippingMethod>>,
  Assert<Equals<S['OrderStatus'], Domain.OrderStatus>>,
  Assert<Equals<S['PaymentStatus'], Domain.PaymentStatus>>,
  Assert<Equals<S['PaymentMethod'], Domain.PaymentMethod>>,
  Assert<Equals<S['Province'], Domain.Province>>,
  Assert<Equals<S['ContactReason'], SchemaContactReason>>,
]
```

- [ ] **Step 4: Verificar.** Run: `npm run api:check && npm run typecheck`. Expected: los dos sin errores. Para confirmar que la aserción funciona, cambiar a mano un valor de un enum del YAML, regenerar, ver que `typecheck` falla y revertir el cambio.
- [ ] **Step 5: Commit** `feat(api-client): contrato del admin, tipos generados y alineación con domain`.

---

### Task 11: `api-client` — cliente, errores, servicios y hooks

**Files:**
- Create: `packages/api-client/src/{index.ts, client.ts, errors.ts, unwrap.ts}`, `packages/api-client/src/services/{catalog.ts, content.ts, settings.ts, reviews.ts, admin-auth.ts, admin-products.ts, index.ts}`, `packages/api-client/src/react/{index.ts, ApiClientProvider.tsx, query-keys.ts, queries.ts}`
- Test: `packages/api-client/src/{client.test.ts, errors.test.ts}`, `packages/api-client/src/services/services.test.ts`, `packages/api-client/src/react/queries.test.ts`

**Interfaces:**
- Consumes: tipos generados (Task 10).
- Produces:
  - **Cliente**:
    - `type ApiFetch = (request: Request) => Promise<Response>`
    - `interface ApiClientOptions { baseUrl: string; fetch?: ApiFetch; credentials?: RequestCredentials; getCsrfToken?: () => string | undefined }`
    - `type ApiClient = Client<paths>` (de openapi-fetch)
    - `createApiClient(options: ApiClientOptions): ApiClient`. Agrega `Accept: application/json` y, si hay token, `X-CSRF-Token` en todo lo que no sea `GET`/`HEAD`.
  - **Errores**:
    - `type ApiErrorKind = 'validation'|'not_found'|'conflict'|'unauthorized'|'forbidden'|'rate_limited'|'server'|'network'`
    - `class ApiError extends Error { readonly kind; readonly status: number | null; readonly problem: Problem | null; readonly fieldErrors: Readonly<Record<string, string>>; readonly retryAfterSeconds: number | null }`
    - `isApiError(error: unknown): error is ApiError`, `apiErrorFromResponse(response: Response, body: unknown): ApiError`, `networkError(cause: unknown): ApiError`
  - **Desenvolver respuestas**: `unwrap<T>(call: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T>` y `unwrapVoid(call): Promise<void>`. Convierten un error HTTP en `ApiError` y un `throw` de red en `networkError`.
  - **Servicios** (todos reciben el `ApiClient` como primer argumento):
    - catálogo: `listCategories`, `listProducts(api, query?: ProductQuery)`, `listAllProducts(api, query?)` (recorre páginas de 100), `getProduct(api, slug)`, `listRelatedProducts(api, slug)`
    - reseñas: `listProductReviews(api, slug, page?)`, `listFeaturedReviews(api)`
    - contenido: `getHomeContent`, `getAboutContent`, `getFaqContent`, `getFooterContent`, `getProductTabsContent`, `getLegalContent(api, document: 'terms' | 'privacy')`
    - ajustes: `getPublicSettings`
    - admin: `adminLogin(api, input)`, `adminLogout(api)`, `getAdminSession(api)`, `getAdminCsrfToken(api)`, `listAdminProducts(api, query?)`
    - `type ProductQuery`: los parámetros de `listProducts` según el contrato.
  - `index.ts` reexporta todo lo anterior y `export type * from './generated/schema'`.
  - **`@galpon/api-client/react`**:
    - `ApiClientProvider({ client, children })`, `useApiClient(): ApiClient` (falla con un mensaje claro si falta el provider)
    - `queryKeys`: `categories()`, `publicSettings()`, `adminSession()`, `adminCsrf()`, `adminProducts(query)`
    - `publicSettingsQuery(api)`, `adminSessionQuery(api)`, `adminCsrfQuery(api)`, `adminProductsQuery(api, query)`: `queryOptions` de TanStack Query.

- [ ] **Step 1: Escribir los tests que fallan.** Usan un `fetch` falso que registra cada `Request` y devuelve el `Response` que se le indique.
  - `createApiClient({ baseUrl: 'http://x/api/v1', fetch })` + `listCategories` pide `GET http://x/api/v1/categories`.
  - Con `getCsrfToken: () => 'tok'`:
    - `adminLogout` manda `X-CSRF-Token: tok`;
    - `listCategories` no manda esa cabecera;
    - sin token, no se manda nunca.
  - `apiErrorFromResponse` (mapeo de estado a `kind`):
    - 422 con `problem+json` y `errors: [{ field:'email', code:'invalid_format', message:'Ingresá un email válido' }]` → `kind: 'validation'` y `fieldErrors.email` con ese mensaje
    - 400 → `'validation'`
    - 401 → `'unauthorized'`, 403 → `'forbidden'`, 404 → `'not_found'`, 409 → `'conflict'`
    - 429 con `Retry-After: 30` → `'rate_limited'` y `retryAfterSeconds: 30`
    - 500 → `'server'`
    - cuerpo que no es JSON → `problem: null`
  - Un `fetch` que rechaza → `ApiError` con `kind: 'network'`.
  - `listAllProducts` con `total: 150` pide `page=1&pageSize=100` y `page=2&pageSize=100`, y devuelve los 150.
  - `adminLogout` con 204 resuelve `undefined`.
  - `useApiClient` sin provider tira "useApiClient necesita <ApiClientProvider>".
  - `publicSettingsQuery(api).queryKey` es igual a `queryKeys.publicSettings()`.

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- packages/api-client`. Expected: FAIL.

- [ ] **Step 3: Implementar.** Los middlewares usan `client.use()` de openapi-fetch. El `fetch` personalizado se pasa en `createClient({ fetch })` y recibe un `Request`. El `baseUrl` siempre es absoluto, porque en Node uno relativo falla.

- [ ] **Step 4: Verificar.** Run: `npm test -- packages/api-client && npm run lint && npm run typecheck` → PASS. En el README de `api-client` documentar el cliente, los errores, los servicios y los hooks.

- [ ] **Step 5: Commit** `feat(api-client): cliente tipado, errores, servicios y hooks de consulta`.

---

### Task 12: `api-client` — fixtures del diseño y base simulada

**Files:**
- Create: `packages/api-client/src/mock/fixtures/{categories.ts, products.ts, reviews.ts, content.ts, settings.ts, index.ts}`, `packages/api-client/src/mock/{types.ts, db.ts, storage.ts}`
- Test: `packages/api-client/src/mock/fixtures/fixtures.test.ts`, `packages/api-client/src/mock/db.test.ts`

**Interfaces:**
- Consumes: `slugify`, `DEFAULT_SHIPPING_OPTIONS`, `PROVINCES` (`domain`); `settingsFormSchema` (`schemas`); tipos generados.
- Produces:
  - **Tipos internos del mock**: `MockCategory`, `MockProduct { id, slug, sequence, categoryId, name, description, priceArs: number | null, stock, featured, status, images: Image[], tabsOverride: { materials?: string; care?: string } | null, previousSlugs: string[], createdAt }`, `MockReview { id, productId, authorName, rating, text, createdAt, status: 'pending'|'approved'|'hidden', featured, verifiedPurchase }`, `MockContent { home, about, faq, footer, productTabs, legal: { terms, privacy } }`, `MockAdminSession { email, csrfToken, expiresAt }`.
  - **`MockDb`**: `{ version: 1; categories; products; reviews; content; settings: AdminSettings; adminAccount: { email; password }; adminSession: MockAdminSession | null; orders: unknown[]; messages: unknown[]; customers: unknown[] }`. Los planes P2–P4 tipan y llenan `orders`, `messages` y `customers`.
  - **Fixtures**: `FIXTURE_CATEGORIES`, `FIXTURE_PRODUCTS`, `FIXTURE_REVIEWS`, `FIXTURE_CONTENT`, `FIXTURE_SETTINGS`.
  - **Base**:
    - `interface MockDbOptions { adminEmail: string; adminPassword: string }`, `DEFAULT_MOCK_DB_OPTIONS: MockDbOptions = { adminEmail: 'admin@galponmates.com.ar', adminPassword: 'galpon-demo-2026' }` (los mismos valores que usan por defecto la tienda y el admin), `createMockDb(options: MockDbOptions): MockDb` (copia profunda con `structuredClone`)
    - `getGlobalMockDb(options: MockDbOptions): MockDb`, guardada en `globalThis.__galponMockDb`
    - `resetGlobalMockDb(): void`
  - **Almacenamiento**:
    - `type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`
    - `safeSessionStorage(): StorageLike | null`: `null` si no existe o si `setItem` tira
    - `createPersistentMockDb(options: MockDbOptions & { storage: StorageLike | null; key: string }): { db: MockDb; isPersistent: boolean; persist(): void; reset(): void }`

**Datos** (todos salen de `docs/design/galpon-tienda-v3/dc-script.js` y `body.html`):

- **Líneas**:
  - `id`: `cat-` + el id del diseño; `slug`: el id del diseño (`imperiales`, `torpedos`, `camioneros`, `ranchero`, `bombillones`, `yerbas`)
  - `name`, `group` y `blurb`: los del diseño; `position`: de 1 a 6
  - `image`: solo `imperiales` tiene la foto del mate
- **Productos** (los 27, en el orden de `P`):
  - `id`: `prd-` + el id del diseño; `slug = slugify(name)`; `sequence`: de 1 a 27
  - `priceArs`: el del diseño (`torpedo-acero` = `null`); `status: 'published'`; `previousSlugs: []`
  - `stock`: 12 por defecto, `galleta` 0 y `coquito-criollo` 2
  - `featured`: los que tienen `feat: 1` (son 8)
  - `images`: solo `imperial-premium` tiene foto: `{ publicId: 'galpon/productos/mate-imperial-premium', url: '/mock-images/mate-imperial-premium.jpg', width: 960, height: 1280, alt: 'Mate Imperial Premium con virola de alpaca cincelada y base con pelotitas de bronce' }`
- **Reseñas**: las de `SEED`, con `status: 'approved'` y `verifiedPurchase: true`.
  - `createdAt` según el mes: "Sep 2026" → `2026-09-15T15:00:00Z`, "Ago" → `2026-08-15…`, "Jul" → `2026-07-15…`, "Jun" → `2026-06-15…`.
  - `featured: true` solo en la primera de `imperial-premium`, de `bombillon-premium-curvo` y de `camionero-pelo`.
- **Contenido**:
  - `home`, `about` y `footer`: el texto literal de `body.html`.
  - `home.storyProducts`: `{ hero: 'mate-imperial-premium', bombillas: ['bombillon-premium-curvo', 'bombillon-100-alpaca'], yerbas: ['yerba-canarias-1-kg', 'yerba-canarias-serena-1-kg', 'yerba-canarias-te-y-jengibre-1-kg'] }`.
  - `faq`: el arreglo `FAQ`, con su `id` y `label`.
  - `productTabs`: el objeto `T` del diseño. El texto "Cada pieza es artesanal…" va en `mate.descriptionNote`.
  - `legal`: título y el cuerpo "Texto de ejemplo. Reemplazar por el texto revisado por un profesional antes de publicar.".
- **Ajustes**: `kitDiscountPercent: 10`, `shippingOptions: DEFAULT_SHIPPING_OPTIONS`, `installments: { maxWithoutInterest: 3, showOnProduct: true }`, `contactEmail: 'galpon.mates@gmail.com'`, `priceDisplay: { showNetPrice: true }`, `vatRatePercent: 21`, `lowStockThreshold: 3` y `seller` con todos los campos en `null`.

- [ ] **Step 1: Escribir los tests que fallan**
  - **fixtures**:
    - 6 líneas y 27 productos
    - slugs únicos e iguales a `slugify(name)`; `sequence` va de 1 a 27
    - cada `categoryId` existe; hay 8 destacados
    - el único con `priceArs: null` es `prd-torpedo-acero`; `prd-galleta` tiene stock 0
    - cada reseña apunta a un producto que existe; hay 3 reseñas destacadas
    - cada slug de `storyProducts` existe
    - `settingsFormSchema.parse(FIXTURE_SETTINGS)` no tira
    - `JSON.parse(JSON.stringify(fixtures))` es igual a los fixtures (son serializables)
  - **db**:
    - modificar `createMockDb(...)` no cambia los fixtures
    - **singleton** (Review Focus 3): `const a = (await import('./db')).getGlobalMockDb(opts); vi.resetModules(); const b = (await import('./db')).getGlobalMockDb(opts); expect(b).toBe(a)`
    - `resetGlobalMockDb()` hace que la próxima llamada devuelva una base nueva
  - **persistente**:
    - con un almacenamiento en memoria, `persist()` y después un `createPersistentMockDb` nuevo con la misma clave recupera los cambios
    - con una `version` guardada distinta, vuelve a sembrar los datos
    - con un almacenamiento cuyo `getItem` tira → `isPersistent: false` y la base funciona igual (Review Focus 4)
    - `safeSessionStorage()` devuelve `null` cuando `setItem` tira

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- packages/api-client`. Expected: FAIL.

- [ ] **Step 3: Escribir los fixtures, `db.ts` y `storage.ts`.** Si el almacenamiento falla, no se loguea nada (`console` está prohibido): se informa por `isPersistent`.

- [ ] **Step 4: Verificar.** Run: `npm test -- packages/api-client && npm run lint && npm run typecheck` → PASS.

- [ ] **Step 5: Commit** `feat(api-client): fixtures del diseño y base simulada`.

---

### Task 13: `api-client` — router simulado, `mockFetch` y handlers de P1

**Files:**
- Create: `packages/api-client/src/mock/{http.ts, router.ts, mock-fetch.ts, mappers.ts, pending.ts, index.ts}`, `packages/api-client/src/mock/handlers/{catalog.ts, reviews.ts, content.ts, settings.ts, admin-auth.ts, admin-products.ts, index.ts}`
- Test: `packages/api-client/src/mock/{router.test.ts, mock-fetch.test.ts, contract-coverage.test.ts}`, `packages/api-client/src/mock/handlers/{catalog,reviews,content,settings,admin-auth,admin-products}.test.ts`

**Interfaces:**
- Consumes: Task 12 (base), Task 11 (`ApiFetch`), `domain` (`isPurchasable`, `maxQuantity`, `formatProductCode`, `netPrice`, `selectRelated`, `matchesSearch`, `sortProducts`, `averageRating`, `ratingDistribution`), `schemas` (`adminLoginSchema`, `toFieldErrors`).
- Produces:
  - **HTTP**: `type HttpMethod = 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'`, `json(data: unknown, status?: number): Response`, `noContent(): Response`, `problem(status: number, title: string, extras?: { detail?: string; errors?: FieldError[]; type?: string }): Response`.
  - **Contexto de cada handler**: `interface MockContext { request: Request; params: Readonly<Record<string, string>>; query: URLSearchParams; db: MockDb; now: Date; body<T>(): Promise<T>; invalidate(tags: readonly string[]): void }`.
  - **Router**:
    - `type MockHandler = (ctx: MockContext) => Response | Promise<Response>`
    - `interface MockRoute { method: HttpMethod; path: string; handler: MockHandler }`
    - `route<P extends keyof paths & string>(method: HttpMethod, path: P, handler: MockHandler): MockRoute`: el path se chequea contra el contrato en tiempo de compilación.
    - `matchRoute(routes: readonly MockRoute[], method: HttpMethod, pathname: string): { route: MockRoute; params: Record<string, string> } | 'method_not_allowed' | null`
  - **Rutas**: `IMPLEMENTED_ROUTES: readonly MockRoute[]`, `PENDING_OPERATIONS: readonly { method: HttpMethod; path: string; plan: 'P2' | 'P3' | 'P4' }[]`.
  - **Fetch simulado**: `createMockFetch(options: { getDb: () => MockDb; latencyMs?: number | readonly [number, number]; now?: () => Date; basePaths?: readonly string[]; onInvalidate?: (tags: readonly string[]) => void; onMutation?: () => void }): ApiFetch`.
    - Por defecto `latencyMs: [150, 400]` y `basePaths: ['/api/mock/v1', '/api/v1']`.
    - `onMutation` corre después de cada método que no es `GET` y responde 2xx.
  - **Mappers**: `toCategory`, `toProductSummary(product, db)`, `toProductDetail(product, db)`, `toReview`, `toPublicSettings(settings)`, `toAdminProduct`.
  - `src/mock/index.ts` exporta `createMockFetch`, `createMockDb`, `getGlobalMockDb`, `resetGlobalMockDb`, `createPersistentMockDb`, `safeSessionStorage` y los tipos.

**Comportamiento:**

- **Respuestas genéricas del router**:
  - ruta desconocida → 404 `problem`
  - método no permitido → 405
  - operación del contrato todavía pendiente → **501** con `title: 'No implementado en el modo de prueba'` y `detail: 'Llega en {plan}'`
- **Lecturas públicas**:
  - **líneas**: `productCount` cuenta solo productos publicados
  - **productos**:
    - filtros por `category` (slug), `group`, `ids` (CSV), `q` (`matchesSearch` sobre nombre, descripción y línea), `featured` y `sort`
    - `pageSize` > 100 → 422 con error en `pageSize`; nunca se devuelven los no publicados
    - en cada producto: `code = formatProductCode(sequence)`; `isSoldOut = stock === 0`; `netPriceArs = netPrice(...)` si `showNetPrice` y hay precio, si no `null`
  - **ficha**:
    - un slug que está en `previousSlugs` devuelve el producto con su slug actual
    - `tabs` combina `productTabs[group]` con el `tabsOverride` del producto
    - `options` solo existe en los mates
  - **reseñas**: solo aprobadas, de a 10 por página, con `stats`
  - **ajustes**: `/settings/public` nunca expone `vatRatePercent` ni `lowStockThreshold`
- **Admin**:
  - `POST /admin/auth/login`:
    - datos inválidos → 422 con `errors`
    - credenciales incorrectas → 401 `'Email o contraseña incorrectos'`
    - correcto → crea la sesión `{ email, csrfToken: crypto.randomUUID(), expiresAt: ahora + 8 h }`
  - **guardia**: `requireAdmin(ctx, { csrf })`. Sin sesión o vencida → 401; si `csrf` es `true` y el `X-CSRF-Token` no coincide → 403.
  - `GET /admin/products` incluye borradores y excluye archivados.

- [ ] **Step 1: Escribir los tests que fallan**
  - **router**:
    - `/products/mate-imperial-premium/reviews` matchea con `/products/{slug}/reviews`, no con `/products/{slug}`
    - se quitan los dos `basePaths`
    - 404, 405 y 501 tienen forma de `problem`
  - **catálogo**:
    - 6 líneas y la suma de `productCount` es 27
    - `group=mate` → `total` 16
    - `q=bombillon` → 8
    - `sort=menor` → el primero cuesta 9999
    - `pageSize=101` → 422
    - `ids=prd-galleta,prd-imperial-premium` → 2
  - **ficha `mate-imperial-premium`**:
    - `code: 'N°01'`, `isPurchasable: true`, `netPriceArs: 33057`
    - `tabs.descriptionNote` no es nulo; `options.leathers` tiene 4 valores
  - **ficha `mate-galleta`**: `isSoldOut: true`, `isPurchasable: false`.
  - `GET /products/mate-torpedo-linea-acero` → `priceArs: null`.
  - **relacionados del Imperial Premium**: 3 imperiales + 1 mate de otra línea.
  - **reseñas del Imperial Premium**: `stats.count` 3, `stats.average` ≈ 4,67, la distribución tiene 2 de cinco estrellas.
  - **destacadas**: 3, cada una con `product.slug`.
  - **contenido**:
    - `/content/legal/terms` → 200; `/content/legal/otros` → 404
    - `/settings/public` no tiene la propiedad `vatRatePercent`
  - **admin**:
    - login con contraseña incorrecta → 401
    - login correcto → 200 con `csrfToken`; después `GET /admin/auth/me` → 200
    - logout sin CSRF → 403; con CSRF → 204; después `me` → 401
    - sesión vencida (`now` + 9 h) → 401
    - `GET /admin/products` sin sesión → 401; con sesión → `total: 27`
  - **`mockFetch`**:
    - con `latencyMs: 0` responde sin demora
    - `onMutation` se llama después del login y no después de un `GET`
  - **`contract-coverage.test.ts`**:
    - lee `../../../../docs/api/openapi.yaml` con `yaml`
    - el conjunto de `(método, path)` del contrato es exactamente `IMPLEMENTED_ROUTES ∪ PENDING_OPERATIONS`
    - los dos conjuntos son disjuntos y no hay rutas que no estén en el contrato

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- packages/api-client`. Expected: FAIL.

- [ ] **Step 3: Implementar.** Toda operación del contrato que no esté en `IMPLEMENTED_ROUTES` va a `PENDING_OPERATIONS` con su plan:
  - P2: reseñas, contacto y arrepentimiento
  - P3: carrito, envío, pedidos, pagos, webhooks y cuenta
  - P4: el resto del admin

- [ ] **Step 4: Verificar.** Run: `npm test -- packages/api-client && npm run lint && npm run typecheck` → PASS. Agregar al README de `api-client` la sección "Modo de prueba": rutas implementadas, pendientes y latencia.

- [ ] **Step 5: Commit** `feat(api-client): API simulada con router, fetch en memoria y handlers de P1`.

---

### Task 14: Tienda (Next.js) — esqueleto conectado al modo de prueba

**Files:**
- Create:
  - `apps/store/{package.json, next.config.ts, tsconfig.json, .env.example, README.md}`
  - `apps/store/public/mock-images/mate-imperial-premium.jpg` (copia de `docs/design/galpon-tienda-v3/assets/`)
  - `apps/store/src/instrumentation.ts`, `apps/store/src/types/css.d.ts`
  - `apps/store/src/lib/{env.ts, csp.ts, revalidate.ts, mock.server.ts, api.server.ts, api.browser.ts}`, `apps/store/src/lib/data/{catalog.ts, settings.ts}`
  - `apps/store/src/app/{layout.tsx, fonts.ts, globals.css, providers.tsx, page.tsx, not-found.tsx}`, `apps/store/src/app/_dev/SettingsProbe.tsx`
  - `apps/store/src/app/api/mock/v1/[[...path]]/route.ts`, `apps/store/src/app/api/revalidate/route.ts`
- Test: `apps/store/src/lib/{env.test.ts, csp.test.ts, revalidate.test.ts}`

**Interfaces:**
- Consumes: `@galpon/api-client` (cliente, servicios, `/react`, `/mock`), `@galpon/design-tokens` (CSS), `@galpon/domain`.
- Produces:
  - **Entorno**:
    - `interface StoreEnv { apiMode: 'mock' | 'live'; apiBaseUrl: string | null; revalidateSecret: string; mockLatencyMs: number | readonly [number, number]; siteUrl: string; mpPublicKey: string | null; cloudinaryCloudName: string | null }`
    - `parseStoreEnv(source: Readonly<Record<string, string | undefined>>): StoreEnv`. Tira `EnvError`, que tiene la lista de problemas en español.
    - `getStoreEnv(): StoreEnv` (memoizado)
  - **Seguridad y caché**:
    - `buildContentSecurityPolicy(options: { isDev: boolean; apiOrigin: string | null }): string`
    - `isValidRevalidateSecret(provided: string | null, expected: string): boolean`
    - `REVALIDATE_TAG_PATTERN`, `revalidationProfileFor(tag: string): 'max' | { expire: 0 }`
  - **Clientes**:
    - `getStoreMockFetch(): ApiFetch`: singleton sobre `getGlobalMockDb(DEFAULT_MOCK_DB_OPTIONS)`; `onInvalidate` llama a `revalidateTag(tag, revalidationProfileFor(tag))`
    - `getServerApi(): ApiClient`: en mock usa `baseUrl: 'http://mock.internal/api/v1'` con `fetch: getStoreMockFetch()`; en live, `${apiBaseUrl}/api/v1`
    - `resolveBrowserBaseUrl(siteUrl: string): string`: `window.location.origin` en el navegador, `siteUrl` en el servidor, siempre con `/api/v1`
    - `getBrowserApi(): ApiClient` (`credentials: 'same-origin'`)
  - **Datos cacheados** (funciones `'use cache'`): `getCategories()` con `cacheLife('hours')` y `cacheTag('categories')`; `getPublicSettings()` con `cacheTag('settings')`.

**Decisiones:**

- **`package.json`**:
  - `"name": "@galpon/store"`
  - scripts `dev`: `next dev --port 3000`, `build`: `next build`, `start`: `next start --port 3000`, `typecheck`: `next typegen && tsc --noEmit`
  - dependencias `next`, `react`, `react-dom`, `@tanstack/react-query`, `zod`, `server-only`, `@fontsource-variable/inter` y los cuatro `@galpon/*`
  - devDependencies `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/turbopack`
- **Reglas de `parseStoreEnv`**:
  - `API_MODE`: `mock` por defecto.
  - `NEXT_PUBLIC_API_MODE`: por defecto igual a `API_MODE`; si es distinto → "NEXT_PUBLIC_API_MODE tiene que ser igual a API_MODE".
  - En `live`:
    - `API_BASE_URL` es obligatoria y tiene que ser un origen `https?://…` sin ruta → "API_BASE_URL es obligatoria cuando API_MODE=live"
    - `NEXT_PUBLIC_MP_PUBLIC_KEY` es obligatoria
    - `REVALIDATE_SECRET` es obligatoria, con 32 caracteres o más
  - En `mock`, `REVALIDATE_SECRET` tiene el valor por defecto `dev-only-revalidate-secret-change-me-0000`.
  - `MOCK_LATENCY_MS`: `'0'` → 0, `'150-400'` → `[150, 400]`, `[150, 400]` por defecto.
  - `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` por defecto.
- **`next.config.ts`**:
  - `parseStoreEnv(process.env)` corre al cargar la config, así un error hace fallar `build`, `dev`, `start` y `typegen` (Review Focus 5)
  - `cacheComponents: true`, `partialPrefetching: true`, `typedRoutes: true`, `agentRules: false`
  - `turbopack: { rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } } }`
  - `rewrites()` síncrono: en `mock`, `/api/v1/:path*` → `/api/mock/v1/:path*`; en `live`, `/api/v1/:path*` → `${API_BASE_URL}/api/v1/:path*`. Los rewrites se fijan en el build: `API_MODE` tiene que estar presente al compilar.
  - `headers()` para `/(.*)`:
    - `Content-Security-Policy`: `buildContentSecurityPolicy(...)` con la política de la tienda de la sección 16 del spec, directiva por directiva
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)`
- **`instrumentation.ts`**: `register()`; si `NEXT_RUNTIME === 'nodejs'`, valida el entorno y sale con `process.exit(1)` si falla. Se permite `process.stderr.write` del mensaje: `console` está prohibido.
- **Route handler del mock**:
  - `GET`, `POST`, `PUT`, `PATCH` y `DELETE` delegan en `getStoreMockFetch()(request)`
  - si `apiMode !== 'mock'` → 404
  - usa `[[...path]]` para que también matchee sin segmentos
- **`/api/revalidate`**:
  - `POST { tags: string[] }` con la cabecera `x-revalidate-secret`
  - secreto inválido → 401; alguna etiqueta fuera de `REVALIDATE_TAG_PATTERN` → 422
  - correcto → `revalidateTag(tag, revalidationProfileFor(tag))` por cada etiqueta y responde 200 `{ revalidated: tags }`
  - `REVALIDATE_TAG_PATTERN = /^(products|categories|settings|product:[a-z0-9-]+|reviews:[a-z0-9-]+|content:[a-z-]+)$/`
  - `content:*` → `'max'`; el resto → `{ expire: 0 }`
- **Fuente**: `fonts.ts` usa `next/font/local` con `../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2` (y la itálica), `weight: '100 900'`, `variable: '--font-inter'`. Así el build no depende de la red.
- **Estilos y layout**:
  - `globals.css`: `@import "tailwindcss"; @import "@galpon/design-tokens/tokens.css"; @import "@galpon/design-tokens/base.css";`
  - `layout.tsx`: `<html lang="es-AR" className={inter.variable}>`, `metadata` con `title: { default: 'Galpón Mates', template: '%s · Galpón Mates' }` y la descripción del pie, `viewport.themeColor: '#1a1210'`, y `Providers` (QueryClient + `ApiClientProvider` con `getBrowserApi()`)
- **`page.tsx` temporal** (se reemplaza en P2; documentarlo en TSDoc):
  - `<h1>Galpón Mates</h1>`, la lista de líneas con `productCount` (de `getCategories()`, del servidor) y `<SettingsProbe />`
  - `SettingsProbe` es un Client Component que usa `useQuery(publicSettingsQuery(useApiClient()))` y muestra "Descuento del kit: 10%". Prueba el camino del navegador.
- **`tsconfig.json`**:
  - extiende `@galpon/config/tsconfig.react.json`
  - `plugins: [{ name: 'next' }]`, `paths: { '@/*': ['./src/*'] }`, `types: ['node']`
  - `include`: `next-env.d.ts`, `next.config.ts`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts` y `src`
  - `src/types/css.d.ts` declara `declare module '*.css'`
- **Vitest**: agregar al `vitest.config.ts` raíz el proyecto `{ test: { name: 'store', root: './apps/store', environment: 'node', include: ['src/**/*.test.ts'] } }`.

- [ ] **Step 1: Escribir los tests que fallan**
  - **`env.test.ts`**:
    - `{}` → `apiMode: 'mock'`, `mockLatencyMs: [150, 400]` y el secreto de desarrollo
    - `{ API_MODE: 'live' }` → tira y el mensaje contiene "API_BASE_URL es obligatoria cuando API_MODE=live" (Review Focus 5)
    - `{ API_MODE: 'mock', NEXT_PUBLIC_API_MODE: 'live' }` → tira "NEXT_PUBLIC_API_MODE tiene que ser igual a API_MODE"
    - live completo pero con un secreto de 10 caracteres → tira
    - `MOCK_LATENCY_MS: '0'` → 0
  - **`csp.test.ts`**:
    - la política de producción contiene `script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com`, `frame-ancestors 'none'` y `object-src 'none'`, y **no** contiene `'unsafe-eval'`
    - la de desarrollo sí contiene `'unsafe-eval'`
    - con `apiOrigin`, ese origen aparece en `connect-src`
  - **`revalidate.test.ts`**:
    - `isValidRevalidateSecret('a', 'b')` → `false`; con el valor correcto → `true`; con `null` → `false`; con largos distintos → `false` sin tirar
    - `revalidationProfileFor('content:home')` → `'max'`; `('products')` → `{ expire: 0 }`
    - el patrón rechaza `'../x'`

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- apps/store`. Expected: FAIL.

- [ ] **Step 3: Implementar los archivos de la lista** con las decisiones anteriores. Escribir `.env.example` con cada variable y su explicación, y el README de la tienda (scripts, modo de prueba, cómo se pasa a vivo).

- [ ] **Step 4: Tests y tipos.** Run: `npm install && npm test -- apps/store && npm run typecheck -w @galpon/store && npm run lint` → PASS.

- [ ] **Step 5: Build y prueba manual**
  - Run: `npm run build -w @galpon/store`. Expected: éxito, y la salida incluye "Cache Components enabled".
  - Run: `npm run start -w @galpon/store` en segundo plano. Después:
    - `curl -s localhost:3000/api/v1/categories` → JSON con 6 líneas
    - `curl -sI localhost:3000/` → incluye `content-security-policy`
    - `curl -s localhost:3000/` → contiene "Imperiales" y "Yerbas"
  - Abrir `http://localhost:3000` y ver "Descuento del kit: 10%".

- [ ] **Step 6: Configuración inválida.** Run: `API_MODE=live npm run build -w @galpon/store`. Expected: falla con "API_BASE_URL es obligatoria cuando API_MODE=live".

- [ ] **Step 7: Commit** `feat(store): esqueleto de la tienda Next.js conectado al modo de prueba`.

---

### Task 15: Admin (Vite) — esqueleto con sesión

**Files:**
- Create:
  - `apps/admin/{package.json, index.html, vite.config.ts, tsconfig.json, tsr.config.json, .env.example, README.md}`
  - `apps/admin/public/favicon.png` (copia de `galpon-mark.png`)
  - `apps/admin/src/{main.tsx, styles.css, vite-env.d.ts}`, `apps/admin/src/test/setup.ts`
  - `apps/admin/src/lib/{env.ts, api.ts, csp.ts, redirect.ts}`
  - `apps/admin/src/routes/{__root.tsx, login.tsx, _authenticated.tsx}`, `apps/admin/src/routes/_authenticated/index.tsx`
  - `apps/admin/src/routeTree.gen.ts` (generado y commiteado)
  - `apps/admin/src/features/auth/{index.ts, README.md, session.ts}`, `apps/admin/src/features/auth/components/LoginForm.tsx`
- Test: `apps/admin/src/lib/{env.test.ts, api.test.ts, redirect.test.ts, csp.test.ts}`, `apps/admin/src/features/auth/components/LoginForm.test.tsx`

**Interfaces:**
- Consumes: `@galpon/api-client` (+ `/react`, `/mock`), `@galpon/schemas` (`adminLoginSchema`), `@galpon/design-tokens`.
- Produces:
  - **Entorno**:
    - `interface AdminEnv { apiMode: 'mock'|'live'; apiBaseUrl: string | null; storeUrl: string; mockAdminEmail: string; mockAdminPassword: string; mockLatencyMs: number | readonly [number, number] }`
    - `parseAdminEnv(source): AdminEnv`. Valores por defecto en mock: `admin@galponmates.com.ar` / `galpon-demo-2026` y `storeUrl` `http://localhost:3000`. En `live`, `VITE_API_BASE_URL` es obligatoria.
  - **API**: `createAdminApi(env: AdminEnv, storage: StorageLike | null): { api: ApiClient; mockStatus: { isPersistent: boolean } | null; setCsrfToken(token: string | undefined): void }`.
    - En mock usa `createPersistentMockDb({ key: 'galpon.admin.mock.v1', … })` y `createMockFetch({ onMutation: persist })`.
    - En live, `createApiClient({ baseUrl: \`${apiBaseUrl}/api/v1\`, credentials: 'include', getCsrfToken })`.
  - **Otros**: `buildAdminCsp(apiOrigin: string | null): string` (política del admin de la sección 16 del spec) y `safeRedirectPath(value: unknown): string` (`'/'` salvo que empiece con una sola `/`).
  - **Sesión**:
    - `RouterContext { queryClient: QueryClient; api: ApiClient; setCsrfToken: (token: string | undefined) => void; mockStatus: { isPersistent: boolean } | null }`
    - `ensureAdminSession(context: RouterContext): Promise<AdminSession>`. Hace `ensureQueryData(adminSessionQuery)` y `ensureQueryData(adminCsrfQuery)`, después llama a `setCsrfToken`. Un `ApiError` `unauthorized` se propaga.
  - **`LoginForm({ onSuccess: (session: AdminLoginResult) => void })`**:
    - React Hook Form + `zodResolver(adminLoginSchema)`
    - 401 → alerta "Email o contraseña incorrectos"; red → "No pudimos conectar, probá de nuevo"; 422 → errores por campo

**Decisiones:**

- **`package.json`**:
  - `"name": "@galpon/admin"`
  - scripts `dev`: `vite --port 5173 --strictPort`, `build`: `vite build`, `preview`: `vite preview --port 5173 --strictPort`, `typecheck`: `tsr generate && tsc --noEmit`
  - dependencias `react`, `react-dom`, `@tanstack/react-router`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `@fontsource-variable/inter` y los `@galpon/*`
  - devDependencies `vite`, `@vitejs/plugin-react`, `@tanstack/router-plugin`, `@tanstack/router-cli`, `tailwindcss`, `@tailwindcss/vite`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` y los tipos
- **`vite.config.ts`**:
  - `plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()]`, en ese orden
  - `preview.headers['Content-Security-Policy'] = buildAdminCsp(apiOrigin)`, leyendo `VITE_API_BASE_URL` con `loadEnv`
- **`index.html`**: `lang="es-AR"`, `<meta name="robots" content="noindex">`, `theme-color` `#1a1210`, `<title>Galpón · Admin</title>`.
- **`styles.css`**: Tailwind + los tokens + `base.css`. En `main.tsx`, `import '@fontsource-variable/inter'`.
- **Rutas**:
  - `__root.tsx` usa `createRootRouteWithContext<RouterContext>()`.
  - `/login` valida su search con Zod `{ redirect?: string }`. Si ya hay sesión, va a `safeRedirectPath(redirect)`.
  - `_authenticated.beforeLoad` llama a `ensureAdminSession`. Con `unauthorized` hace `throw redirect({ to: '/login', search: { redirect: location.href } })`.
  - `_authenticated/index.tsx` (temporal, lo reemplaza P4):
    - "Hola, {email}"
    - "Productos cargados: {total}" (de `adminProductsQuery({ page: 1, pageSize: 1 })`)
    - botón "Cerrar sesión": `adminLogout`, `queryClient.clear()`, va a `/login`
    - aviso "Modo de prueba" (+ "sin persistencia" si `isPersistent` es `false`)
- **`tsconfig.json`**: extiende `tsconfig.react.json`, con `types: ['vite/client', 'node']` e `include: ['src', 'vite.config.ts']`.
- **Vitest**: agregar al `vitest.config.ts` raíz el proyecto `{ test: { name: 'admin', root: './apps/admin', environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], setupFiles: ['./src/test/setup.ts'] } }`.
- Los valores por defecto de `parseAdminEnv` en mock son `DEFAULT_MOCK_DB_OPTIONS` de `@galpon/api-client/mock`.

- [ ] **Step 1: Escribir los tests que fallan**
  - **`env.test.ts`**: `{}` → mock con las credenciales por defecto; `{ VITE_API_MODE: 'live' }` sin URL → tira "VITE_API_BASE_URL es obligatoria cuando VITE_API_MODE=live".
  - **`redirect.test.ts`**: `safeRedirectPath('/productos')` → `'/productos'`; `('//evil.com')`, `('https://evil.com')` y `(undefined)` → `'/'`.
  - **`csp.test.ts`**: la política contiene `script-src 'self'`, no contiene `'unsafe-inline'` en `script-src`, e incluye `https://api.cloudinary.com` en `connect-src`.
  - **`api.test.ts`** (mock con un almacenamiento en memoria y latencia 0):
    - `adminLogin` correcto y después `getAdminSession` → 200
    - un `createAdminApi` nuevo con el **mismo** almacenamiento simula una recarga: `getAdminSession` sigue en 200
    - con el almacenamiento en `null` → `mockStatus.isPersistent === false` y el login funciona igual
  - **`LoginForm.test.tsx`**:
    - enviar vacío muestra "Ingresá un email válido" y "Requerido"
    - contraseña incorrecta muestra la alerta (`role="alert"`) "Email o contraseña incorrectos"
    - credenciales correctas llaman a `onSuccess` con el email

- [ ] **Step 2: Correr y ver que fallan.** Run: `npm test -- apps/admin`. Expected: FAIL.

- [ ] **Step 3: Implementar** los archivos de la lista con las decisiones anteriores. `src/test/setup.ts` hace `import '@testing-library/jest-dom/vitest'`. Escribir el `.env.example` y el README (scripts, modo de prueba, credenciales de prueba, CSP).

- [ ] **Step 4: Verificar**
  - Run: `npm install && npm test -- apps/admin && npm run typecheck -w @galpon/admin && npm run lint` → PASS.
  - Run: `npm run build -w @galpon/admin && npm run preview -w @galpon/admin` y abrir `http://localhost:5173`:
    - redirige a `/login`
    - con las credenciales de prueba muestra "Hola, admin@galponmates.com.ar" y "Productos cargados: 27"
    - al recargar sigue con la sesión; "Cerrar sesión" vuelve a `/login`

- [ ] **Step 5: Commit** `feat(admin): esqueleto del dashboard Vite con sesión en modo de prueba`.

---

### Task 16: E2E de humo y CI

**Files:**
- Create: `playwright.config.ts`, `e2e/support/test.ts`, `e2e/store/smoke.spec.ts`, `e2e/admin/auth.spec.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: las apps de las Tasks 14 y 15.
- Produces: `e2e/support/test.ts` exporta `test` y `expect`. `test` está extendido con un fixture automático `cspGuard` que junta los mensajes de consola con "Content Security Policy" o "Refused to" y hace fallar el test si hay alguno.

**Decisiones:**

- **`playwright.config.ts`**:
  - `testDir: './e2e'`, `fullyParallel`, `forbidOnly` y `retries: 2` en CI, `trace: 'on-first-retry'`
  - proyectos:
    - `store-desktop` (`Desktop Chrome`, `baseURL: 'http://localhost:3000'`, `testMatch: /store\/.*\.spec\.ts/`)
    - `store-mobile` (`Pixel 7`)
    - `admin-desktop` (`Desktop Chrome`, `baseURL: 'http://localhost:5173'`, `testMatch: /admin\/.*\.spec\.ts/`)
  - `webServer`:
    - `{ command: 'npm run start -w @galpon/store', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, timeout: 120_000 }`
    - `{ command: 'npm run preview -w @galpon/admin', url: 'http://localhost:5173', … }`
  - Las dos apps se compilan antes (`npm run build`).
- **CI** (`.github/workflows/ci.yml`; la raíz del repo es la del workspace, así que no hace falta `working-directory`):
  - `on: push (main) + pull_request`, con `concurrency` y cancelación de la corrida anterior.
  - **Job `checks`** (`ubuntu-latest`), pasos en orden:
    1. `actions/checkout@v7`
    2. `actions/setup-node@v7` con `node-version: 24` y `cache: npm`
    3. `npm ci`
    4. `npm run api:lint`, `npm run api:check`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`
  - **Job `e2e`** (`needs: checks`): el mismo setup, después `npx playwright install --with-deps chromium`, `npm run build` y `npm run test:e2e`. Por último, `actions/upload-artifact@v7` del `playwright-report/` con `if: ${{ !cancelled() }}` y `retention-days: 7`.

- [ ] **Step 1: Escribir los E2E** (todos importan `test` de `e2e/support/test.ts`)
  - **`store/smoke.spec.ts`**:
    - `/` muestra el `heading` "Galpón Mates" y los nombres de las 6 líneas (de "Imperiales" a "Yerbas")
    - muestra "Descuento del kit: 10%" (el camino del navegador vía `/api/v1`)
    - `request.get('/api/v1/categories')` → 200 con 6 elementos
    - la respuesta de `/` trae la cabecera `content-security-policy`
  - **`admin/auth.spec.ts`**:
    - entrar a `/` redirige a `/login`
    - con la contraseña incorrecta aparece "Email o contraseña incorrectos"
    - con las credenciales de prueba aparecen "Hola, admin@galponmates.com.ar" y "Productos cargados: 27"
    - `page.reload()` mantiene la sesión
    - "Cerrar sesión" vuelve a `/login`

- [ ] **Step 2: Correr.** Run: `npm run build && npx playwright install chromium && npm run test:e2e`. Expected: PASS en los 3 proyectos y ninguna violación de CSP.

- [ ] **Step 3: Escribir `.github/workflows/ci.yml`** con las decisiones anteriores. Verificar que el YAML es válido parseándolo: `node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8'))"` termina con exit 0. No hay que pushear: el CI corre cuando Lucas suba el repo.

- [ ] **Step 4: Commit** `test(e2e): pruebas de humo de tienda y admin, y workflow de CI`.

---

### Task 17: Documentación final, ADRs y ajustes del spec

**Files:**
- Create: `README.md`, `docs/adr/README.md`, `docs/adr/0001-next-tienda-y-vite-admin.md`, `0002-contrato-openapi-fuente-de-verdad.md`, `0003-modo-de-prueba-mock-en-servidor-y-rewrite.md`, `0004-mercado-pago-redireccion-y-secure-fields.md`, `0005-cloudinary-subida-firmada.md`, `0006-montos-en-pesos-enteros.md`, `0007-typescript-6-eslint-9-y-opciones.md`
- Modify: `docs/superpowers/specs/2026-10-19-galpon-frontend-design.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: documentación. No hay código.

- [ ] **Step 1: README raíz**
  - qué es el repo y dónde están los otros dos repos
  - requisitos: Node ≥ 22.12 (se recomienda 24) y npm ≥ 10
  - levantar todo en modo de prueba en 3 comandos (`npm install`, `npm run dev`, abrir `http://localhost:3000` y `http://localhost:5173` con las credenciales de prueba)
  - tabla de scripts y mapa de carpetas (sección 4 del spec)
  - cómo pasar a vivo (link a la sección 13.4 del spec)
  - cómo agregar una dependencia (se fija la versión exacta en `scripts/dependency-versions.json` y se usa la misma en el `package.json`)
  - convenciones (link a la sección 6 del spec)
  - "los push los hace Lucas"

- [ ] **Step 2: ADRs.**
  - Formato: título, Estado ("Aceptada"), Fecha (2026-10-20), Contexto, Decisión, Consecuencias, Alternativas consideradas.
  - El contenido sale de las secciones del spec y de este plan:
    - 0001: decisión de Lucas, opción C
    - 0002: el contrato como fuente de verdad, los tipos generados y `contract-alignment`
    - 0003: el mock en el servidor de Next con *rewrite* del mismo dominio y la base del admin en `sessionStorage`
    - 0004: los dos modos de MP, Secure Fields, 3-D Secure, idempotencia, un intento activo, los estados normalizados y la API de MP que se elige en la fase 2 (queda en estado "Aceptada; la API concreta se fija en la fase 2")
    - 0005: Cloudinary con subida firmada directa por XHR
    - 0006: pesos enteros (D1)
    - 0007: TS 6.0.3 y ESLint 9.39, sin `exactOptionalPropertyTypes`, jsdom 29, npm workspaces con versiones exactas centralizadas y `openapi-typescript` vía `npx`
  - `docs/adr/README.md` es el índice con una línea por ADR.

- [ ] **Step 3: Ajustar el spec** con los "Refinamientos del spec" de este plan:
  - sección 12: rutas de contenido separadas, slug canónico con 200, `ProductTabs.descriptionNote`, respuesta del login del admin
  - sección 13.1: el export de fixtures pasa a la fase 2
  - sección 20: typecheck en `pre-push`
  - sección 5: npm workspaces (pedido de Lucas: `npm i` y `npm run dev`), versiones exactas en `scripts/dependency-versions.json` y versiones fijadas (`@hookform/resolvers` 5.9.2, jsdom 29.1.1, TanStack Table 9)

- [ ] **Step 4: Verificación final de P1**
  - Run: `npm run format:check && npm run api:lint && npm run api:check && npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run test:e2e`. Expected: todo en verde.
  - Comprobar el criterio de "listo" de P1: las dos apps arrancan en modo de prueba, CI escrito, y `domain` y `schemas` con sus umbrales de cobertura cumplidos.

- [ ] **Step 5: Commit** `docs: README, ADRs y ajustes del spec al cerrar P1`.
