# 0007. TypeScript 6, ESLint 9, npm workspaces y versiones fijadas

- **Estado**: Aceptada
- **Fecha**: 2026-10-20

## Contexto

El 2026-10-20 se eligieron las versiones del stack con la regla "la última estable **compatible con la matriz de dependencias**", es decir, que `npm install` termine sin errores de peers. Las últimas versiones de algunas herramientas todavía no las soportan sus plugins, y Lucas pidió instalar con `npm i` y levantar todo con `npm run dev` (el plan arrancó con pnpm y se cambió a npm el mismo día).

## Decisión

**Lenguaje y lint**

- **TypeScript 6.0.3**, no 7: `typescript-eslint` y `openapi-typescript` todavía no lo soportan. Se revisa cuando salga TypeScript 7.1.
- **ESLint 9.39.5**, no 10: `eslint-plugin-jsx-a11y`, `eslint-config-next` y `eslint-plugin-import` todavía no lo soportan. Config plana (`eslint.config.mjs`) con `typescript-eslint` `strictTypeChecked`, `eslint-plugin-boundaries`, `jsx-a11y`, `react-hooks`, `perfectionist` y `eslint-config-prettier`.
- **Opciones de TypeScript**: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules` y `skipLibCheck`. **Sin `exactOptionalPropertyTypes`**: choca con los tipos que infiere Zod y con las props opcionales de Radix y React Hook Form, y el costo supera el beneficio. TypeScript 6 ya no incluye los `@types/*` por su cuenta, así que cada `tsconfig.json` declara su `types`.
- **jsdom 29.1.1**, no 30: jsdom 30 pide Node `^22.22.2 || ^24.15.0 || >=26` y en la máquina de Lucas corre Node 22.20. jsdom 29 funciona desde Node 22.13.

**Gestor de paquetes**

- **npm workspaces** (`apps/*` y `packages/*`). Los paquetes propios se declaran con `"*"`. `npm run dev` levanta la tienda (:3000) y el admin (:5173) juntos con `concurrently`.
- **Versiones exactas, centralizadas** en `scripts/dependency-versions.json`, la fuente única. `npm run lint` ejecuta `scripts/check-dependency-versions.mjs`, que falla si algún `package.json` declara otra versión, usa `^` o `~`, o agrega un paquete que no está en el archivo (en `peerDependencies` va `^` más la versión fijada).
- **`openapi-typescript` no se instala**: se ejecuta con `npx --yes openapi-typescript@7.13.0`. Su peer pide TypeScript 5 y npm no admite ese conflicto con TypeScript 6.
- **Node**: `engines.node: ">=22.12"` y `engines.npm: ">=10"`. `.nvmrc` y el CI usan Node 24.

**Avisos de `npm audit`**

- `overrides: { "handlebars": "4.7.10" }` en el `package.json` raíz: `handlebars` llega por `eslint-plugin-boundaries` y las versiones que traía tenían 3 avisos críticos. Con el _override_ quedan en cero.
- Quedan **6 avisos de severidad alta** que vienen de `braces` (denegación de servicio por agotamiento de pila con patrones muy anidados, GHSA-vfj7-8cjw-p6xm), a través de `micromatch`, `@boundaries/elements`, `fast-glob`, `eslint-plugin-boundaries` y `@next/eslint-plugin-next`. No hay una versión corregida de `braces`: lo único que propone `npm audit fix --force` es instalar `eslint-plugin-boundaries@1.1.1`, una versión vieja con cambios incompatibles. Son herramientas de lint que solo corren en desarrollo y en CI: no forman parte de ninguna app compilada ni procesan entradas de usuarios. Se dejan y se vuelve a mirar cuando haya versión nueva.

## Consecuencias

- Instalaciones reproducibles: la misma versión en cada máquina y en el CI, y un cambio de versión es siempre un cambio explícito de un solo archivo.
- Subir de versión es trabajo manual (no hay `^`): un cambio en `dependency-versions.json`, el mismo en cada `package.json`, `npm install` y las verificaciones. A cambio, no hay sorpresas.
- `npm audit` sigue mostrando 6 avisos altos hasta que haya versión corregida; el README lo explica para que nadie "los arregle" con `--force`.
- El script de chequeo es código propio que mantener.
- Hay que revisar TypeScript 7.1, ESLint 10 y jsdom 30 cuando los plugins y Node de Lucas los soporten.

## Alternativas consideradas

- **pnpm** (con `catalog:` para centralizar versiones): era la primera opción y resuelve bien los peers, pero Lucas pidió `npm i` y `npm run dev`, y `catalog:` y `workspace:*` rompen `npm install`.
- **TypeScript 7 o ESLint 10**: más nuevos, pero con plugins que todavía no funcionan; un lint roto cuesta más que la novedad.
- **`exactOptionalPropertyTypes` activado**: más estricto, pero obliga a envolver los tipos de Zod, Radix y React Hook Form en cada borde.
- **Rangos con `^`**: menos mantenimiento, pero una instalación nueva podría traer una versión que rompa el build sin haber cambiado nada en el repo.
