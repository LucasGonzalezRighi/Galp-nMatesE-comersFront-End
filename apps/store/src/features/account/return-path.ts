/** Inicio del área del cliente: adonde se vuelve si `volver` no sirve. */
export const ACCOUNT_HOME = '/cuenta'

/** Página de ingreso de clientes. */
export const LOGIN_PATH = '/cuenta/ingresar'

/** Páginas de acceso: volver a ellas después de ingresar dejaría a la persona en un círculo. */
const AUTH_PATHS = [LOGIN_PATH, '/cuenta/registro', '/cuenta/recuperar', '/cuenta/restablecer']

/** Origen ficticio para interpretar rutas relativas con las mismas reglas que el navegador. */
const BASE = 'http://tienda.invalid'

/**
 * Ruta interna (camino, consulta y ancla) que representa `value` con las reglas del navegador, o
 * `null` si apunta a otro sitio. Así `//otro.sitio`, `/\otro.sitio` o una ruta con tabulaciones
 * no pasan aunque empiecen con `/`.
 */
function internalPath(value: string): string | null {
  if (!value.startsWith('/')) return null
  let url: URL
  try {
    url = new URL(value, BASE)
  } catch {
    return null
  }
  if (url.origin !== BASE || value.startsWith('//') || /[\\\s]/.test(value)) return null
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Ruta a la que se vuelve después de ingresar o crear la cuenta, a partir del parámetro `volver`.
 * Solo acepta rutas de la tienda: cualquier otra cosa (otro sitio, `javascript:`, una página de
 * acceso) vuelve a `/cuenta`, así un enlace armado por otro no lleva a ningún lado raro.
 *
 * @param value - Valor de `volver` en la dirección, o `null` si no vino.
 * @returns Una ruta interna segura.
 * @example
 * safeReturnPath('/cuenta/pedidos') // "/cuenta/pedidos"
 * safeReturnPath('//evil.example') // "/cuenta"
 */
export function safeReturnPath(value: string | null): string {
  const path = value === null ? null : internalPath(value)
  if (path === null) return ACCOUNT_HOME
  const pathname = path.split(/[?#]/)[0] ?? ''
  return AUTH_PATHS.includes(pathname) ? ACCOUNT_HOME : path
}

/**
 * Ruta de ingreso que, después de iniciar sesión, vuelve a `returnPath`.
 *
 * @param returnPath - Ruta interna a la que se vuelve.
 * @returns `/cuenta/ingresar?volver=…`.
 * @throws {RangeError} Si `returnPath` no es una ruta interna de la tienda.
 * @example
 * loginPath('/cuenta/pedidos') // "/cuenta/ingresar?volver=%2Fcuenta%2Fpedidos"
 */
export function loginPath(returnPath: string): string {
  const path = internalPath(returnPath)
  if (path === null) {
    throw new RangeError(
      `La ruta de regreso tiene que ser interna (empezar con "/"); se recibió ${JSON.stringify(returnPath)}.`,
    )
  }
  return `${LOGIN_PATH}?volver=${encodeURIComponent(path)}`
}
