# `app`: estructura del dashboard

Lo que envuelve a todas las pantallas con sesión. No es una feature: puede usar las features por su `index.ts` (hoy, `auth`).

- **`createAdminQueryClient({ api, setCsrfToken })`** (`query-client.ts`, lo usa `main.tsx`): `retry: shouldRetryQuery` y `staleTime` de 30 s. Un `401` con la sesión abierta (de una consulta que no sea la de la sesión ni la del CSRF, o de una escritura) abre "Tu sesión venció"; un `403` en una escritura vuelve a pedir el token CSRF sin caché, se lo pasa al cliente y avisa "Actualizamos tu sesión. Probá de nuevo." (no reintenta solo; si ese pedido da `401`, abre el diálogo). Por eso las features no atrapan ni el `401` ni el `403`.
- **`AdminLayout({ context, email, children })`** (lo usa `routes/_authenticated.tsx`, dentro de `ImageUploaderProvider`): "Saltar al contenido" (`#contenido`); desde 1024 px, barra lateral fija de 240 px; debajo, barra superior de 56 px con "Menú" (cajón de Radix de 280 px desde la izquierda, "Cerrar menú", se cierra al navegar), la marca y el aviso de modo. `main#contenido` con `max-w-6xl`; al cambiar de ruta (no en la primera carga) el foco va al `h1`. Monta `SessionExpiredDialog` y maneja "Cerrar sesión" (si falla, toast "No pudimos cerrar la sesión, probá de nuevo.").
- **`AdminSidebar`**: marca + "Admin", "Modo de prueba" y "Sin persistencia…" (se vuelve a leer al terminar cada escritura), el menú (`nav-items.ts`: activo con `aria-current="page"`; Contenido activo en todo `/contenido/*`) con los contadores de `adminDashboardQuery` (cada 60 s; no se muestran en 0; "Pedidos, 3 para despachar"), el email, "Ver tienda", "Mi cuenta" y "Cerrar sesión".
- Textos en `app.copy.ts` (también los del 404 y el error de ruta de `__root.tsx`).

Tests: `createAdminTestApp` (`admin-test-app.test-helper.ts`) es `createTestApp` con esta caché y la sesión marcada abierta en el store.
