# Feature `auth`

Sesión del administrador en el dashboard: iniciar sesión y asegurarse de que haya una antes de entrar a las rutas protegidas.

## Qué exporta (`index.ts`)

- **`LoginForm({ onSuccess })`**: formulario con React Hook Form y `adminLoginSchema`. Muestra "Email o contraseña incorrectos" ante un 401, "No pudimos conectar, probá de nuevo" si no hay red y el mensaje del servidor en cada campo ante un 422. Llama a `onSuccess` con el `AdminLoginResult`; la ruta `/login` guarda el token CSRF y navega.
- **`ensureAdminSession(context)`**: consulta la sesión y el token CSRF (desde la caché si ya los tiene), le pasa el token al cliente con `setCsrfToken` y devuelve la sesión. Si no hay sesión propaga el `ApiError` `unauthorized`; la decisión de ir a `/login` la toma `routes/_authenticated.tsx`.
- **`RouterContext`**: lo que el router le da a cada ruta: `queryClient`, `api`, `apiMode` (`mock` o `live`), `storeUrl` (la tienda, sin barra final), `setCsrfToken`, `mockStatus` (`null` en vivo) y `registerMockImage` (en modo de prueba registra una foto reducida en la base simulada; en vivo es `null` y las fotos van a Cloudinary). Lo arma `main.tsx` con `createAdminApi` (`src/lib/api.ts`); en los tests, `createTestApp` (`src/test/render.tsx`).

## Cómo se protege una ruta

Toda ruta que necesite sesión cuelga de `routes/_authenticated/`. El layout `_authenticated.tsx` llama a `ensureAdminSession` en `beforeLoad` y, con `unauthorized`, redirige a `/login?redirect=<ruta>`. Después del login, `safeRedirectPath` (`src/lib/redirect.ts`) solo deja volver a rutas internas.

Importá la feature solo por su `index.ts`.
