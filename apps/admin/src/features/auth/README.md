# Feature `auth`

Sesión del administrador en el dashboard: iniciar sesión, asegurarse de que haya una antes de entrar a las rutas protegidas, volver a entrar cuando vence con una pantalla abierta y cambiar la contraseña.

## Qué exporta (`index.ts`)

- **`LoginForm({ onSuccess, defaultEmail? })`**: formulario con React Hook Form y `adminLoginSchema`. Muestra "Email o contraseña incorrectos" ante un 401, "No pudimos conectar, probá de nuevo" si no hay red y el mensaje del servidor en cada campo ante un 422. Llama a `onSuccess` con el `AdminLoginResult`.
- **`LoginScreen({ onSuccess })`**: la pantalla de `/login` ("Galpón Mates", "Ingresá para administrar la tienda.") con `document.title` "Ingresar · Galpón Admin".
- **`ensureAdminSession(context)`**: consulta la sesión y el token CSRF (desde la caché si ya los tiene), le pasa el token al cliente con `setCsrfToken`, marca la sesión abierta en el store (solo la primera vez: no cierra un aviso de vencida) y devuelve la sesión. Si no hay sesión propaga el `ApiError` `unauthorized`; la decisión de ir a `/login` la toma `routes/_authenticated.tsx`.
- **`storeAdminSession(context, result)`**: guarda la sesión recién abierta (token al cliente, sesión y CSRF en la caché) y la marca abierta. La usan `/login` y "Tu sesión venció".
- **`useSessionExpiredStore`** (zustand): `hasSession`, `isExpired`, `markSessionStarted`, `markSessionExpired` (sin una sesión abierta no hace nada) y `markLoggedOut`. Lo escriben la caché de la app (`app/query-client.ts`), la subida de fotos (`onUnauthorized`) y "Cerrar sesión".
- **`SessionExpiredDialog({ context, email })`**: "Tu sesión venció" (Ruling P4-3). Modal que no se cierra con Escape ni tocando afuera, con el `LoginForm` (email cargado, foco en la contraseña). Al entrar: `storeAdminSession`, `invalidateQueries({ queryKey: ['admin'] })` y toast "Listo, ya podés seguir."; lo editado sigue en pantalla. "Ir a la pantalla de ingreso" navega a `/login?redirect=` con la ruta actual (pasa por `UnsavedChangesGuard`) y saca la sesión y el CSRF de la caché recién cuando la navegación sigue (`onBeforeNavigate` del router, antes del `beforeLoad` de `/login`): si se elige "Seguir editando", la caché los conserva. Lo monta `app/AdminLayout.tsx`.
- **`AccountScreen`**: "Mi cuenta" (`/cuenta`) con `ChangePasswordForm` (`adminPasswordChangeSchema`): "Contraseña actual", "Contraseña nueva" (ayuda "Mínimo 10 caracteres, con letras y números") y "Repetí la contraseña nueva"; "Cambiar contraseña" / "Cambiando…"; éxito: toast "Contraseña cambiada." y el formulario vacío; `422` en cada campo. El `401` y el `403` no los atrapa: los maneja la estructura.
- **`RouterContext`**: lo que el router le da a cada ruta: `queryClient`, `api`, `apiMode` (`mock` o `live`), `storeUrl` (la tienda, sin barra final), `setCsrfToken`, `mockStatus` (`null` en vivo) y `registerMockImage` (en modo de prueba registra una foto reducida en la base simulada; en vivo es `null`). Lo arma `main.tsx` con `createAdminApi` (`src/lib/api.ts`); en los tests, `createTestApp` (`src/test/render.tsx`). `SessionContext` es la parte que usan `storeAdminSession` y el diálogo.

## Cómo se protege una ruta

Toda ruta que necesite sesión cuelga de `routes/_authenticated/`. El layout `_authenticated.tsx` llama a `ensureAdminSession` en `beforeLoad` y, con `unauthorized`, redirige a `/login?redirect=<ruta>`. Después del login, `safeRedirectPath` (`src/lib/redirect.ts`) solo deja volver a rutas internas.

Con una pantalla abierta, un `401` (de una consulta que no sea la de la sesión ni la del CSRF, o de una escritura) no redirige: abre "Tu sesión venció" (`app/query-client.ts`). Las features no lo atrapan.

Importá la feature solo por su `index.ts`.
