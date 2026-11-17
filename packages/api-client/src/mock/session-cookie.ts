/**
 * Nombre de la cookie de sesión de la tienda en el modo de prueba. En vivo es
 * `__Host-galpon_session`, pero un navegador no acepta el prefijo `__Host-` en `http://localhost`.
 *
 * Vive en un módulo sin dependencias para que `proxy.ts` (que corre también en vivo) la importe
 * desde `@galpon/api-client/mock/session-cookie` sin arrastrar la base, los fixtures ni los
 * handlers del modo de prueba.
 */
export const DEFAULT_CUSTOMER_SESSION_COOKIE = 'galpon_session'

/**
 * Nombre de la cookie de sesión del admin en el modo de prueba. En vivo es `__Host-galpon_admin`;
 * acá va sin el prefijo por lo mismo que la de la tienda.
 */
export const MOCK_ADMIN_SESSION_COOKIE = 'galpon_admin'
