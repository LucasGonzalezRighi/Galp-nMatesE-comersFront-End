# @galpon/admin

Dashboard de Galpón Mates: una SPA de Vite con React 19, TanStack Router (rutas por archivos) y TanStack Query. En esta fase tiene el esqueleto con sesión: `/login` y una pantalla provisoria que reemplaza el dashboard de la fase P4.

## Scripts

Desde `frontend/` (con `-w @galpon/admin`) o dentro de `apps/admin`:

| Script              | Qué hace                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo en <http://localhost:5173> (puerto fijo; si está ocupado, falla). Sin CSP.  |
| `npm run build`     | Compila a `dist/`.                                                                                 |
| `npm run preview`   | Sirve `dist/` en <http://localhost:5173> con la CSP del admin (así se prueba, también en los E2E). |
| `npm run typecheck` | `tsr generate && tsc --noEmit`: regenera `src/routeTree.gen.ts` y revisa los tipos.                |

Desde `frontend/`, `npm run dev` levanta la tienda (:3000) y el admin (:5173) juntos.

`src/routeTree.gen.ts` lo genera el plugin del router (en `dev` y `build`) o `tsr generate`. Está commiteado, y excluido de lint y prettier. No se edita a mano.

## Modo de prueba

Sin variables de entorno el dashboard arranca en **modo de prueba**: no necesita backend. Un `fetch` en memoria (`@galpon/api-client/mock`) responde como la API, sobre una base sembrada con los fixtures del diseño (27 productos).

- Los cambios y la sesión se guardan en `sessionStorage` (clave `galpon.admin.mock.v1`): sobreviven a las recargas y se pierden al cerrar la pestaña.
- Si el navegador no deja usar `sessionStorage` (navegación privada, políticas), sigue funcionando en memoria y la pantalla avisa "sin persistencia".
- Credenciales de prueba:
  - Email: `admin@galponmates.com.ar`
  - Contraseña: `galpon-demo-2026`
- Cada pedido demora entre 150 y 400 ms, como una API real (`VITE_MOCK_LATENCY_MS=0` para no esperar).

## Variables de entorno

Se validan al arrancar (`src/lib/env.ts`); si alguna no sirve, la pantalla muestra el motivo en español. Ver `.env.example`; para cambiarlas, copiarlo a `.env.local`.

| Variable                                            | Para qué                                                                                                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_MODE`                                     | `mock` (por defecto) o `live`.                                                                                                                                                    |
| `VITE_API_BASE_URL`                                 | Origen de la API (por ejemplo `https://api.galponmates.com.ar`): sin ruta, búsqueda ni credenciales, ni `/api/v1`. Obligatoria con `live`; se llama con `credentials: 'include'`. |
| `VITE_STORE_URL`                                    | Enlace a la tienda (por defecto `http://localhost:3000`).                                                                                                                         |
| `VITE_MOCK_ADMIN_EMAIL`, `VITE_MOCK_ADMIN_PASSWORD` | Cuenta de prueba (solo `mock`).                                                                                                                                                   |
| `VITE_MOCK_LATENCY_MS`                              | Demora simulada: `200`, `0` o un rango `150-400` (solo `mock`).                                                                                                                   |

Pasar a la API real es cambiar las variables y volver a compilar; no hay cambios de código.

## Seguridad: CSP

La SPA no tiene scripts inline, así que la política es estricta (`src/lib/csp.ts`, sección 16 del spec):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://res.cloudinary.com;
connect-src 'self' <origen de VITE_API_BASE_URL> https://api.cloudinary.com;
frame-ancestors 'none'
```

- `vite preview` la manda sola (`vite.config.ts`, leyendo `VITE_API_BASE_URL` con `loadEnv`). `vite dev` no, porque Vite inyecta scripts inline para el HMR.
- **El servidor que sirva `dist/` en producción tiene que mandar la misma cabecera** `Content-Security-Policy`, además de `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y una `Permissions-Policy` restrictiva (spec §16), y servir `index.html` para cualquier ruta (es una SPA).
- `buildAdminCsp(apiOrigin)` arma la cabecera: se le puede pasar el origen (o una URL con ruta) de la API.

## Estructura

```
src/
  main.tsx            arranque: entorno, API, router y proveedores
  routes/             rutas por archivos de TanStack Router
    __root.tsx        contexto del router (RouterContext), 404 y error
    login.tsx         /login (?redirect= validado con Zod)
    _authenticated.tsx  protege lo que cuelga de él: sin sesión, va a /login
    _authenticated/index.tsx  / (provisorio)
  features/auth/      LoginForm y ensureAdminSession (ver su README)
  lib/                env.ts, api.ts (createAdminApi: API real o simulada con la demo), csp.ts, redirect.ts
  components/ui/      kit de interfaz (cx, buttonClass, Button, Spinner, …)
  test/               setup.ts (polyfills de jsdom y cleanup) y render.tsx (createTestApp, renderWithApp)
```

## Tests de pantallas

`createTestApp({ loggedIn, demo, now })` (`src/test/render.tsx`) arma la API simulada sin latencia, con la sesión iniciada y los datos de demostración, y devuelve `{ api, mockDb, queryClient, context, session }`. `renderWithApp(ui, { app, path, routePath })` dibuja la pantalla dentro de los proveedores y de un router en memoria que la muestra en `path`; cualquier otra dirección muestra "Ruta de prueba: {pathname}", así se afirma adónde navegó un `Link`. El reloj de la API es fijo (`TEST_NOW`) salvo que el test pase otro.

Toda ruta nueva que necesite sesión va dentro de `routes/_authenticated/`.
