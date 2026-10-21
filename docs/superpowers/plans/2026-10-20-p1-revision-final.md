# Revisión final de integración: P1 · Fundaciones y contrato

- Rama: `feat/p1-fundaciones` (base `main`, HEAD `50a04f0`). Árbol limpio, salvo el plan de P2 sin seguimiento.
- Alcance: revisión de integración. No se revisó línea por línea: cada bloque ya tuvo su revisión.
- Fecha: 2026-10-21.

## Veredicto

**Lista después de un arreglo.** Hay que corregir una frase del README que exagera lo que hace el build del dashboard. Lo demás queda descartado o pasa a P2 o una fase posterior.

## Verificaciones corridas

| Comando             | Resultado                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `npm test`          | 1452/1452 tests pasan                                                                      |
| `npm run lint`      | Versiones OK (8 `package.json`) y ESLint sin errores                                       |
| `npm run typecheck` | OK en todos los workspaces y en la raíz                                                    |
| `npm run api:check` | Los tipos commiteados coinciden con `openapi.yaml`                                         |
| Extra               | `actions/checkout`, `actions/setup-node` y `actions/upload-artifact` tienen la etiqueta `v7` |

Build y E2E (13/13) no se volvieron a correr: el controlador los corrió minutos antes.

## 1. Review Focus: cada punto tiene un test

| #   | Riesgo                                       | Dónde se prueba                                                                                                                                                                                                                                              |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fecha en el borde del mes                    | `packages/domain/src/dates.test.ts:16`: `2026-09-01T02:00:00Z` se muestra "Ago 2026"                                                                                                                                                                         |
| 2   | Búsqueda con acentos y mayúsculas            | `packages/domain/src/text.test.ts:29-33` (bombillon, BOMBILLÓN, te y jengibre) y, de punta a punta en el mock, `packages/api-client/src/mock/handlers/catalog.test.ts:31-32`                                                                                  |
| 3   | Una sola base simulada en el servidor        | `packages/api-client/src/mock/db.test.ts:96`: con `vi.resetModules()` el módulo se carga dos veces y devuelve la misma base; `:103` guarda la base en `globalThis.__galponMockDb`                                                                             |
| 4   | Admin con `sessionStorage` bloqueado         | `packages/api-client/src/mock/db.test.ts:204,222,232` (un `getItem` o `setItem` que tira, o sin almacenamiento, sigue en memoria), `:267-304` (`safeSessionStorage`) y `apps/admin/src/lib/api.test.ts:46` (sin almacenamiento, el login funciona igual) |
| 5   | Configuración incoherente al compilar        | `apps/store/src/lib/env.test.ts:35,42,50,106`. `apps/store/next.config.ts:18` llama a `parseStoreEnv` cuando carga, así que el error corta `dev`, `build` y `start`                                                                                           |

## 2. Desacople

- `eslint.config.mjs:108-160` tiene `default: 'disallow'`:
  - `domain` no tiene ninguna política de salida, así que no puede importar nada.
  - `schemas` → `domain`, `design-tokens` → `domain` (Ruling 16) y `api-client` → `schemas` y `domain`.
  - Apps y features → paquetes. Una feature solo depende de su propia app. Para entrar a una feature hay que pasar por `index.ts`.
- Las dependencias de los `package.json` coinciden con esto: `domain` no tiene ninguna.
- Imports de `apps/*/src`: solo usan `@galpon/api-client`, `@galpon/api-client/react`, `@galpon/api-client/mock` y `@galpon/schemas`, más rutas relativas dentro de la misma app. No hay imports profundos a paquetes ni de una app a la otra.
- Detalle sin acción: el README raíz describe las dependencias sin nombrar `design-tokens` → `domain`.

## 3. Pasar de prueba a vivo solo con variables

- **Tienda**: `parseStoreEnv` se encarga de la validación:
  - En vivo exige `API_BASE_URL`, `NEXT_PUBLIC_MP_PUBLIC_KEY` y un `REVALIDATE_SECRET` de 32 caracteres o más.
  - `NEXT_PUBLIC_API_MODE` tiene que ser igual a `API_MODE`.
  - Según el modo:
    - `rewrites` lleva a `/api/mock/v1` o a `${API_BASE_URL}/api/v1`.
    - `getServerApi` usa el mock en el mismo proceso o `API_BASE_URL`.
    - El route handler del mock responde 404 en vivo.
  - `getBrowserApi` siempre habla con `/api/v1` del mismo origen, sin saber en qué modo está.
  - No hay código que dé por hecho el mock.
- **Dashboard**: `parseAdminEnv` y `createAdminApi` eligen entre `fetch` en memoria con `sessionStorage` o la API real con `credentials: 'include'` y CSRF. Tampoco hay código que asuma el mock.
- **Diferencia con lo que dice la documentación** (ver *mustFix*): en el dashboard, `vite.config.ts` solo lee `VITE_API_BASE_URL` para armar la CSP y nunca llama a `parseAdminEnv`.
  - Con `VITE_API_MODE=live` y sin `VITE_API_BASE_URL`, `vite build` compila sin errores.
  - El error aparece recién al abrir la app, en la pantalla "Configuración inválida".
  - `apps/admin/README.md:33` lo describe bien. `README.md:111` dice en cambio que una configuración incoherente "hace fallar el build", y eso no vale para el dashboard.

## 4. Seguridad

- **CSP de la tienda** (`apps/store/src/lib/csp.ts`):
  - Coincide con §16 del spec: `'unsafe-inline'` en scripts es una concesión documentada para no perder el render estático.
  - Incluye `object-src 'none'`, `base-uri 'self'`, `form-action` y `frame-ancestors 'none'`.
  - Las cabeceras `nosniff`, `Referrer-Policy`, HSTS y `Permissions-Policy` salen desde `next.config.ts`.
- **CSP del dashboard** (`apps/admin/src/lib/csp.ts`):
  - Es estricta y coincide con §16 (`script-src 'self'`).
  - Rechaza `;`, `,` y espacios en el origen.
  - Solo se aplica en `vite preview`. El README del dashboard documenta que el hosting tiene que repetirla.
- **Secretos**:
  - Solo están versionados `apps/*/.env.example`, sin secretos. `.gitignore` ignora `.env` y `.env.*`.
  - La búsqueda de tokens (`APP_USR-`, `sk_live`, `ghp_`, `AKIA`, claves PEM, JWT) solo encontró el valor de prueba `APP_USR-0000` en `env.test.ts`.
  - La contraseña del dashboard de prueba está publicada en el README a propósito.
- **Sesión y CSRF en el mock** (`packages/api-client/src/mock/handlers/admin-auth.ts`):
  - Si no hay sesión o venció, responde 401. Si una escritura llega sin `X-CSRF-Token` o con uno distinto, responde 403.
  - El login no exige sesión (`security: []`) y devuelve `{ email, csrfToken, expiresAt }`.
  - `GET /admin/auth/csrf` vuelve a entregar el token, y el logout exige CSRF.
  - Es coherente con el contrato (`SameSite=Lax`, `X-CSRF-Token`). El mock no maneja cookies por diseño (ADR 0003).
- **`/api/revalidate`** (`apps/store/src/lib/revalidate.ts`):
  - Compara con `timingSafeEqual` sobre los SHA-256 de los dos valores: el tiempo es constante y no revela el largo del secreto. Un secreto esperado vacío hace tirar la función.
  - Un secreto inválido da 401 y un cuerpo inválido da 422.
  - Acepta como máximo 50 etiquetas, todas validadas contra un patrón.
  - En vivo exige un secreto de 32 caracteres o más. En modo de prueba usa uno de desarrollo, aceptable porque el mock solo existe en desarrollo.

## 5. README para alguien que llega nuevo

- `npm install`, después `npm run dev` y abrir `:3000` y `:5173`.
- Los puertos son fijos: `next dev --port 3000` y `vite --port 5173 --strictPort`.
- Los datos de acceso de prueba (`admin@galponmates.com.ar` / `galpon-demo-2026`) coinciden con `DEFAULT_MOCK_DB_OPTIONS` y con `.env.example`.
- `engines` pide Node 22.12 o más nuevo, y `.nvmrc` y el CI usan 24.
- También están documentados el aviso de `npm audit`, cómo agregar una dependencia y cómo correr los E2E. Se puede seguir sin tropiezos.

## 6. Triage de los *minor* del ledger

### mustFix

1. **`README.md:111`**: la frase "Una configuración incoherente hace fallar el build con un mensaje en español" no vale para el dashboard. Arreglo: escribir que hace fallar el build **de la tienda** y que el dashboard muestra el motivo en pantalla al abrirse (como dice `apps/admin/README.md:33`). Otra opción es que `vite.config.ts` valide con `parseAdminEnv`; la dejo para P4 (ver abajo).

### Pasan a P2 o después

- **Dashboard**: validar el entorno en `vite.config.ts` para que un `VITE_API_MODE=live` sin URL corte el build. Cuidado: `env.ts` importa `@galpon/api-client/mock`. Fase: P4, antes de pasar a vivo.
- **Dashboard**: `main.tsx` y `lib/api.ts` importan `@galpon/api-client/mock` de forma estática. Por eso los fixtures y la contraseña de prueba quedan en el bundle aunque esté en vivo. Pasar a `import()` condicionado a `import.meta.env.VITE_API_MODE === 'mock'`. Fase: P4.
- **Mock de la tienda**: la base es una sola por proceso y el route handler también atiende `/admin/*`. Una sesión abierta (del admin hoy, del cliente en P3) se vuelve global para todos los visitantes. Opciones: identificar la sesión del mock con una cookie y responder 404 a `/admin/*` desde la tienda. Fase: P3.
- **Tienda**: `getServerApi` es un único cliente sin cookies del pedido. Para `/cuenta` hace falta un cliente por pedido que reenvíe `__Host-galpon_session`. Fase: P3.
- **Ledger, "Deferred→P2"**: un slug inválido en `getProduct` hace tirar `RangeError`. La página de producto tiene que convertirlo en `notFound()`. Fase: P2.
- **Batch 4**: falta el middleware de `orderToken` (`getOrderToken`), o corregir el texto del contrato. Fase: P3.
- **Batch 5b**: la escena "pieces" del inicio tiene `-10%` escrito a mano. Usar un marcador `{discount}`. Fase: P4.
- **Batch 3**: `tokens.typography.fontFamily` tiene `var()`, y canvas o three necesitan una familia en texto plano. Fase: P5.
- **Batch 3**: `tokens.css` usa `@theme` sin `static`. Tailwind v4 descarta las variables que no usa ninguna utilidad, y la T14 no lo verificó. Revisar con las primeras pantallas de P2 y pasar a `@theme static` si se leen variables desde JS o CSS suelto. Fase: P2.
- **Task 4**: `pluralize` no agrupa los miles ("1234 reseñas"). Usar el formato `es-AR` cuando se muestren los totales de reseñas. Fase: P2.
- **Task 16**: a `ci.yml` le faltan `permissions: contents: read` y `timeout-minutes` por job. Son 3 líneas de endurecimiento: en un repo nuevo el token ya es de solo lectura por defecto. Hacerlo en el primer commit de P2.
- **Task 16**: el test de logout no vuelve a comprobar que la sesión quedó cerrada (por ejemplo, que al volver a `/` redirija a `/login`). Sumarlo cuando crezcan los E2E del dashboard. Fase: P4.
- **Seguridad**: a la CSP del dashboard le faltan `base-uri 'self'`, `form-action 'self'` y `object-src 'none'`. No es un hueco, porque `object-src` hereda de `default-src`. Agregarlas junto con el spec §16. Fase: P4.

### Descartados (sin acción)

- **Task 1**: `pesos(-0)`, `formatDiscountPercent`, el desborde de `sumPesos` y el error de JSON del chequeo de versiones. Resueltos en `440ba32` (3b).
- **Task 1**: los `export default` de config sin TSDoc y `@ts-check` en `.mjs` sin `checkJs`. Son archivos de herramientas cubiertos por tests; no son API.
- **Task 2**: `maxQuantity`, `formatProductCode`, el límite de `selectRelated`, el `switch` exhaustivo, el `Collator` a nivel de módulo y el TSDoc de `sortProducts`. Resueltos en `440ba32`.
- **Task 2**: `\p{Diacritic}` quita `^` y `` ` ``. Lo pide el plan y no afecta al catálogo.
- **Task 2**: `isOneOf` repetido. Ya no queda ninguna copia fuera de los tests.
- **Task 3**: tope de `remainingQuantityFor`, cantidades inválidas, `undefined` explícito en el kit, TSDoc de las líneas y `{@link}`. Resueltos en `440ba32`.
- **Task 3b**: el `{@link}` muerto, `isPurchasable` contra `maxQuantity`, el `NaN` de `selectRelated` y el JSON válido que no es objeto. Resueltos en `8edfacc` y `35187e6`.
- **Task 3b**: el chequeo de entero en rango repetido. Ya existe `assertValidQuantity`; lo que queda es deliberado.
- **Task 4**: días imposibles en `dates.ts`. Resuelto en `8edfacc`.
- **Task 4**: `DEFAULT_SHIPPING_OPTIONS` mutables. La base clona los envíos y el test "modificar la base no cambia… los envíos de fábrica" lo cubre.
- **Task 5**: `cardholderSchema` evalúa el documento dos veces. El costo es despreciable.
- **Task 5**: `XInput` y `X` solo existen para los schemas de objeto. Es intencional.
- **Task 5**: hay tests que solo afirman `success === false`. Ahora `validation-cases.json` (250 casos) fija el campo y el mensaje.
- **Task 5**: la redacción del TSDoc de `missingAsEmpty` y los mensajes extra de `MESSAGES`. Cosmético o justificado.
- **Batch 3**: los tests de admin y del campo trampa sin `path`, y la marca combinante literal. Resueltos en `2f57071`.
- **Batch 4**: `SameSite`, `TotalArs`, el patrón de `assertSlug`, el `unwrap` que no es `TypeError` y la nota de `page`/`pageSize` en el README. Resueltos en `07d5b80`, `c3c25f2` y `50a04f0`.
- **Batch 5b** (los nueve): resueltos en `c3c25f2` y `07d5b80`.
- **Batch 6**: los puntos 1, 2, 3, 4, 6 y 7 se resolvieron en `0b8b821`, `c95cbd0` y `14f98ac`. La ruta de fuentes (punto 5) queda como está (Ruling 21): si npm deja de hoistear el paquete, el build falla con un error claro.
- **Wave A**: los puntos 1, 2, 3, 4, 6, 8, 9 y 10 se resolvieron en `50a04f0`. El 5 pasó a P2 (ver arriba).
- **Wave A, punto 7**: `types: ["node"]` en `schemas` sigue el mismo criterio que los Rulings 3 y 23. Solo afecta al chequeo de tipos.
- **Task 16**: `export { expect }` sin TSDoc. Es una reexportación.
- **Task 16**: el test que dice "por /api/v1" no espera la respuesta. `SettingsProbe` es un Client Component con `useQuery` y la página no precarga datos en el servidor, así que el texto aparece solo cuando el navegador ya llamó a `/api/v1`. El título dice la verdad.
- **Task 16**: el README no avisa sobre `reuseExistingServer`. Ya dice "o reutiliza los que ya estén en los puertos 3000 y 5173".

## 7. Ajustes aplicados tras la revisión final

Commit `fix: ajustes de la revisión final de P1`.

- **README.md (sección "Pasar a la API real")**: la frase "Una configuración incoherente hace fallar el build con un mensaje en español" no valía para el dashboard, porque `apps/admin/vite.config.ts` no llama a `parseAdminEnv`: con `VITE_API_MODE=live` y sin `VITE_API_BASE_URL`, `vite build` compila igual y el error aparece al abrir la app ("Configuración inválida"). Ahora dice que hace fallar el build de la tienda y que el dashboard muestra el motivo en pantalla al abrirse, igual que `apps/admin/README.md`.
- Solo cambió documentación, así que no hay test nuevo ni se corrieron `build` ni `test:e2e`.
- Verificado después del cambio: `npm test` (51 archivos, 1452 tests), `npm run lint`, `npm run typecheck` y `npm run format:check`, todos en verde.
- Pendiente menor sin tocar: `docs/adr/0003-modo-de-prueba-mock-en-servidor-y-rewrite.md` (línea 19) repite la misma imprecisión ("al arrancar el admin… hace fallar el build"). No estaba en los hallazgos; conviene ajustarlo si se vuelve a editar el ADR.
