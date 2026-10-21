# Galpón Mates — Frontend

El frontend del e-commerce de **Galpón Mates** (mates, bombillones y yerba con envío a todo el país): la **tienda pública** (Next.js) y el **dashboard** del dueño (Vite + React), con los paquetes que comparten.

Este repo es la carpeta `frontend/` de `E-comers Marcos/`. El proyecto tiene dos repos en GitHub, cada uno en su carpeta:

| Carpeta     | Repo                                                                                               | Qué tiene                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `frontend/` | [Galp-nMatesE-comersFront-End](https://github.com/LucasGonzalezRighi/Galp-nMatesE-comersFront-End) | Este repo: tienda, dashboard, paquetes compartidos y el contrato de la API         |
| `backend/`  | [Galp-nMatesE-comersBack-end](https://github.com/LucasGonzalezRighi/Galp-nMatesE-comersBack-end)   | La API (NestJS hexagonal, PostgreSQL, Redis). Es la fase 2 y todavía no está hecha |

**Los push los hace Lucas.** Las conversaciones de desarrollo solo hacen commits locales.

## Estado

La **fase 1 (P1: fundaciones y contrato)** está cerrada tras la revisión final: reglas de negocio y validaciones con tests, tokens de diseño, el contrato OpenAPI completo, el cliente de la API con modo de prueba, y las dos apps arrancando como esqueletos. Las pantallas reales llegan en los planes P2 a P5. El recorrido, las decisiones que cambiaron y lo que sigue están en la [bitácora](docs/BITACORA.md).

## Requisitos

- **Node 22.12 o más nuevo** (se recomienda **24**, que es el de `.nvmrc` y el del CI).
- **npm 10 o más nuevo** (viene con Node).

## Levantar todo en modo de prueba

No hace falta backend ni variables de entorno: las dos apps usan una API simulada (ver [ADR 0003](docs/adr/0003-modo-de-prueba-mock-en-servidor-y-rewrite.md)).

```bash
npm install
npm run dev
# abrir http://localhost:3000 (tienda) y http://localhost:5173 (dashboard)
```

Credenciales de prueba del dashboard:

- Email: `admin@galponmates.com.ar`
- Contraseña: `galpon-demo-2026`

Notas:

- Los puertos son fijos (3000 y 5173); si alguno está ocupado, el comando falla.
- Para levantar una sola app: `npm run dev:store` o `npm run dev:admin`.
- La tienda y el dashboard **no comparten datos de prueba**: lo que se cambia en el dashboard no se ve en la tienda hasta que exista el backend real.
- La primera vez que se genera el contrato (`npm run api:generate`) `npx` descarga `openapi-typescript`, así que hace falta conexión.

## Scripts

Se corren desde esta carpeta.

| Script                  | Qué hace                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`           | Tienda (:3000) y dashboard (:5173) juntos, en modo de prueba                                                                                            |
| `npm run dev:store`     | Solo la tienda                                                                                                                                          |
| `npm run dev:admin`     | Solo el dashboard                                                                                                                                       |
| `npm run build`         | Compila la tienda y el dashboard                                                                                                                        |
| `npm run typecheck`     | TypeScript en todos los workspaces y en la raíz                                                                                                         |
| `npm run lint`          | Chequea que las versiones de las dependencias sean las fijadas y corre ESLint                                                                           |
| `npm run format`        | Aplica Prettier a todo el repo                                                                                                                          |
| `npm run format:check`  | Comprueba el formato sin cambiar archivos                                                                                                               |
| `npm test`              | Tests unitarios y de componentes (Vitest)                                                                                                               |
| `npm run test:coverage` | Lo mismo con cobertura; `domain` y `schemas` exigen 100 % de líneas, funciones y sentencias, y 95 % de ramas                                            |
| `npm run test:e2e`      | Pruebas de humo de punta a punta con Playwright, sobre lo compilado (necesita `npm run build` antes y `npx playwright install chromium` la primera vez) |
| `npm run api:lint`      | Valida `docs/api/openapi.yaml` con Redocly                                                                                                              |
| `npm run api:generate`  | Regenera los tipos de `packages/api-client` desde el contrato                                                                                           |
| `npm run api:check`     | Falla si los tipos commiteados no coinciden con el contrato                                                                                             |

Al instalar, `lefthook` deja un hook de **pre-commit** (Prettier y ESLint sobre lo que se commitea) y uno de **pre-push** (`typecheck`, para que los commits sigan siendo rápidos).

## Pruebas de punta a punta y CI

Las pruebas de `e2e/` (Playwright, configuradas en `playwright.config.ts`) son de humo: corren sobre lo compilado, en modo de prueba.

- **Tienda** (`e2e/store`, en Chrome de escritorio y en un Pixel 7): el título y las seis líneas, el descuento del kit (el camino del navegador por `/api/v1`), `GET /api/v1/categories` y la cabecera `Content-Security-Policy`.
- **Dashboard** (`e2e/admin`, en Chrome de escritorio): la redirección a `/login`, el aviso de contraseña incorrecta, el ingreso con las credenciales de prueba, la sesión que sobrevive a una recarga y el cierre de sesión.
- Todos los tests importan `test` de `e2e/support/test.ts`, que suma un fixture automático (`cspGuard`): si la consola de la página informa una violación de la CSP, el test falla.

Para correrlas: `npm run build`, `npx playwright install chromium` (la primera vez) y `npm run test:e2e`. Playwright levanta la tienda (`npm run start -w @galpon/store`) y el dashboard (`npm run preview -w @galpon/admin`), o reutiliza los que ya estén en los puertos 3000 y 5173.

El CI (`.github/workflows/ci.yml`, Node 24) corre en cada pull request y en cada push a `main`, y cancela la corrida anterior de la misma rama. El job `checks` hace `npm ci`, `api:lint`, `api:check`, `lint`, `typecheck` y `test:coverage`. El job `e2e`, que arranca cuando `checks` sale bien, instala Chromium, compila y corre `test:e2e`, y sube el informe de Playwright como artefacto por 7 días. Todavía no corrió: lo hará cuando Lucas suba el repo.

## Mapa de carpetas

```
frontend/
├─ apps/
│  ├─ store/                    Tienda pública · Next.js (App Router)
│  └─ admin/                    Dashboard · Vite + React
├─ packages/
│  ├─ api-client/               Tipos generados del contrato, cliente HTTP tipado, hooks y modo de prueba
│  ├─ schemas/                  Validaciones Zod compartidas, con mensajes en español
│  ├─ domain/                   Reglas de negocio puras: dinero, kit, carrito, envío, cuotas, búsqueda
│  ├─ design-tokens/            Tokens del diseño (tema de Tailwind v4 y constantes)
│  └─ config/                   Configuración base de TypeScript y Prettier
├─ e2e/                         Pruebas de humo de punta a punta (Playwright): tienda y dashboard
├─ docs/
│  ├─ api/                      Contrato OpenAPI, la fuente de verdad entre front y back
│  ├─ adr/                      Decisiones de arquitectura
│  ├─ design/                   Referencia visual exportada (no se importa desde el código)
│  ├─ superpowers/              Diseños (specs) y planes de implementación
│  └─ BITACORA.md               Qué se hizo, cuándo, qué cambió y qué sigue
├─ scripts/                     Versiones fijadas de las dependencias y su chequeo
├─ .github/workflows/ci.yml     Integración continua: verificaciones y E2E
└─ lefthook.yml                 Hooks de git
```

Dependencias permitidas (las controla ESLint con `eslint-plugin-boundaries`): las apps usan los paquetes, `api-client` usa `schemas` y `schemas` usa `domain`; una app nunca importa de la otra. Los paquetes exportan código fuente TypeScript, sin paso de build. El detalle está en la [sección 4 del diseño](docs/superpowers/specs/2026-10-19-galpon-frontend-design.md).

Cada app y cada paquete tiene su propio `README.md` con lo que hace y cómo se usa: [tienda](apps/store/README.md), [dashboard](apps/admin/README.md), [`api-client`](packages/api-client/README.md), [`schemas`](packages/schemas/README.md), [`domain`](packages/domain/README.md), [`design-tokens`](packages/design-tokens/README.md) y [`config`](packages/config/README.md).

## Pasar a la API real

Se hace cambiando variables de entorno y volviendo a compilar, sin tocar código: `API_MODE` y `NEXT_PUBLIC_API_MODE` (tienda) y `VITE_API_MODE` (dashboard) pasan a `live`, y se completan `API_BASE_URL`, `VITE_API_BASE_URL`, `NEXT_PUBLIC_MP_PUBLIC_KEY` y `REVALIDATE_SECRET`. Una configuración incoherente hace fallar el build con un mensaje en español. La lista completa de variables y el procedimiento están en la [sección 13.4 del diseño](docs/superpowers/specs/2026-10-19-galpon-frontend-design.md#134-pasar-a-vivo) y en los README de la [tienda](apps/store/README.md) y del [dashboard](apps/admin/README.md).

## El contrato de la API

[`docs/api/openapi.yaml`](docs/api/openapi.yaml) es la fuente de verdad de rutas, datos y errores ([ADR 0002](docs/adr/0002-contrato-openapi-fuente-de-verdad.md), [guía del contrato](docs/api/README.md)). Para cambiarlo: editar el YAML, correr `npm run api:lint` y `npm run api:generate`, y commitear el YAML junto con `packages/api-client/src/generated/schema.d.ts`. El backend implementa este mismo archivo; los cambios se hacen en los dos repos en el mismo cambio funcional. Las reglas de validación se comparten con el back en [`docs/api/validation-cases.json`](docs/api/validation-cases.json): casos de entrada con el campo y el mensaje esperados, que los tests de los dos repos pueden recorrer.

## Agregar una dependencia

Las versiones son **exactas** (sin `^` ni `~`) y salen de un único archivo, [`scripts/dependency-versions.json`](scripts/dependency-versions.json).

1. Verificar que la versión sea compatible con las demás (que `npm install` termine sin errores de peers).
2. Agregar el paquete con su versión exacta a `scripts/dependency-versions.json`.
3. Declararlo en el `package.json` del workspace que lo usa con **esa misma versión**. Los paquetes propios (`@galpon/*`) se declaran con `"*"`, y en `peerDependencies` va `^` más la versión.
4. Correr `npm install` y después `npm run lint`: el chequeo falla si algún `package.json` se desvía.

Mientras no estén soportados por las herramientas del repo, no se sube a TypeScript 7, ESLint 10 ni jsdom 30 ([ADR 0007](docs/adr/0007-typescript-6-eslint-9-y-opciones.md)). `openapi-typescript` no se instala: se ejecuta con `npx` en los scripts `api:*`.

### Avisos de `npm audit`

`npm install` puede mostrar avisos de seguridad. Están revisados:

- `handlebars` (crítico, llega por `eslint-plugin-boundaries`) está resuelto con `overrides` en el `package.json` raíz, que lo fija en 4.7.10.
- Quedan **6 avisos de severidad alta** por `braces` (denegación de servicio con patrones muy anidados) en las herramientas de lint (`micromatch`, `fast-glob`, `eslint-plugin-boundaries` y `@next/eslint-plugin-next`). No tienen versión corregida, solo corren en desarrollo y en el CI, y no forman parte de ninguna app compilada. **No correr `npm audit fix --force`**: baja `eslint-plugin-boundaries` a una versión vieja e incompatible. Detalle en el [ADR 0007](docs/adr/0007-typescript-6-eslint-9-y-opciones.md).

## Convenciones

Resumen (la versión completa es la [sección 6 del diseño](docs/superpowers/specs/2026-10-19-galpon-frontend-design.md#6-convenciones-de-código)):

- Identificadores, carpetas y archivos en **inglés**; textos de la interfaz, mensajes de error y documentación (TSDoc) en **español**. TSDoc en todo lo que se exporta.
- Una funcionalidad es una carpeta (`components/`, `hooks/`, `lib/`, `index.ts` como API pública y `README.md`); otras partes solo importan por su `index.ts`.
- Montos en pesos enteros ([ADR 0006](docs/adr/0006-montos-en-pesos-enteros.md)), con formato `$39.999`. Fechas visibles en `America/Argentina/Buenos_Aires`.
- Prohibido (lo bloquea ESLint): `any`, `@ts-ignore`, `console.log`, la aserción `!`, `dangerouslySetInnerHTML` y los imports internos de otra funcionalidad.
- Commits convencionales en español, por ejemplo `feat(store): agrega carrito lateral`.
- Fin de línea LF en todo el repo (`.gitattributes`), aunque se trabaje en Windows.

## Documentación

- [Bitácora](docs/BITACORA.md): qué se construyó en P1 y cuándo, decisiones que cambiaron, lecciones y próximos pasos.
- [Decisiones de arquitectura](docs/adr/README.md): siete ADRs.
- [Diseño del frontend](docs/superpowers/specs/2026-10-19-galpon-frontend-design.md) y [diseño del backend](docs/superpowers/specs/2026-10-20-galpon-backend-design.md).
- [Plan de implementación de P1](docs/superpowers/plans/2026-10-20-p1-fundaciones-y-contrato.md).
- [Contrato de la API](docs/api/README.md).
