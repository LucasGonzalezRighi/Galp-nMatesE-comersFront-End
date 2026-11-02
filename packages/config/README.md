# @galpon/config

Configuración base compartida del workspace: TypeScript y Prettier. No tiene código ni dependencias propias; cada app y cada paquete extiende lo que necesita.

## Qué exporta

| Export                               | Archivo               | Para qué                                                                                                                   |
| ------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@galpon/config/tsconfig.base.json`  | `tsconfig.base.json`  | Código TypeScript sin navegador: `ES2023`, sin `DOM`, `types: []`, `strict` y las demás opciones obligatorias del proyecto |
| `@galpon/config/tsconfig.react.json` | `tsconfig.react.json` | Extiende la base y agrega `DOM`, `DOM.Iterable` y `jsx: "react-jsx"`                                                       |
| `@galpon/config/prettier`            | `prettier.config.mjs` | Estilo de Prettier: sin punto y coma, comillas simples, comas finales, 100 columnas y orden de clases de Tailwind          |

TypeScript 6 ya no incluye los `@types/*` instalados por su cuenta: la base declara `types: []` y cada `tsconfig.json` agrega los que usa (por ejemplo, `["node"]`).

## Quién extiende qué

| Proyecto                                                                   | Extiende                                          | `types`                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------- |
| Raíz (`tsconfig.json`: `vitest.config.ts`, `playwright.config.ts`, `e2e/`) | `tsconfig.base.json`                              | `["node"]`                              |
| `packages/domain`                                                          | `tsconfig.base.json`                              | —                                       |
| `packages/schemas`                                                         | `tsconfig.base.json`                              | —                                       |
| `packages/design-tokens`                                                   | `tsconfig.base.json`                              | `["node"]` (sus tests leen archivos)    |
| `packages/api-client`                                                      | `tsconfig.react.json` (tiene el subpath `/react`) | `["node"]` (sus tests leen el contrato) |
| `apps/store` (Next.js)                                                     | `tsconfig.react.json` (+ plugin de Next)          | `["node"]`                              |
| `apps/admin` (Vite)                                                        | `tsconfig.react.json`                             | `["vite/client", "node"]`               |

Prettier se configura una sola vez: el `prettier.config.mjs` de la raíz reexporta `@galpon/config/prettier`.

ESLint no vive acá: su configuración está en `eslint.config.mjs`, en la raíz del repo, porque cubre todo el workspace (incluidos los límites entre paquetes y apps).
