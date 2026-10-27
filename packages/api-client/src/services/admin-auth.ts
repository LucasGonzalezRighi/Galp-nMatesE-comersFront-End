import type { ApiClient } from '../client'
import type {
  AdminLoginInput,
  AdminLoginResult,
  AdminPasswordChange,
  AdminSession,
  CsrfToken,
} from '../generated/schema'
import { unwrap, unwrapVoid } from '../unwrap'

/**
 * Inicia la sesión del dashboard. La cookie de sesión la guarda el navegador; el token anti-CSRF
 * viene en el resultado.
 *
 * @param api - Cliente de la API.
 * @param input - Email y contraseña del administrador.
 * @throws {ApiError} Si falla (`unauthorized` si las credenciales son incorrectas,
 * `rate_limited` si hubo demasiados intentos).
 */
export function adminLogin(api: ApiClient, input: AdminLoginInput): Promise<AdminLoginResult> {
  return unwrap(api.POST('/admin/auth/login', { body: input }))
}

/**
 * Cierra la sesión del dashboard.
 *
 * @param api - Cliente de la API (con `getCsrfToken`, porque es una escritura).
 * @throws {ApiError} Si la llamada falla.
 */
export function adminLogout(api: ApiClient): Promise<void> {
  return unwrapVoid(api.POST('/admin/auth/logout'))
}

/**
 * Trae la sesión activa del dashboard.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Con `kind: 'unauthorized'` si no hay sesión.
 */
export function getAdminSession(api: ApiClient): Promise<AdminSession> {
  return unwrap(api.GET('/admin/auth/me'))
}

/**
 * Vuelve a pedir el token anti-CSRF de la sesión actual, por ejemplo después de recargar la página.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Con `kind: 'unauthorized'` si no hay sesión.
 */
export function getAdminCsrfToken(api: ApiClient): Promise<CsrfToken> {
  return unwrap(api.GET('/admin/auth/csrf'))
}

/**
 * Cambia la contraseña del administrador. La sesión abierta sigue valiendo.
 *
 * @param api - Cliente de la API (con `getCsrfToken`, porque es una escritura).
 * @param input - Contraseña actual, la nueva y su repetición.
 * @throws {ApiError} Con `validation` si la actual no es correcta (en `currentPassword`), si la
 *   nueva no cumple las reglas (en `newPassword`) o si la repetición no coincide (en
 *   `confirmation`); `unauthorized` si la sesión venció y `forbidden` (`csrf_invalid`) si el
 *   token CSRF falta o no es el de la sesión.
 */
export function changeAdminPassword(api: ApiClient, input: AdminPasswordChange): Promise<void> {
  return unwrapVoid(api.POST('/admin/auth/password', { body: input }))
}
