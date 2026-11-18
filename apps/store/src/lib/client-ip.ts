/**
 * Cabecera con el secreto compartido con el backend (`API_PROXY_SECRET` acá, `TRUSTED_PROXY_SECRET`
 * allá): le prueba que el pedido sale del servidor de la tienda. Nunca llega al navegador.
 */
export const PROXY_SECRET_HEADER = 'x-galpon-proxy-secret'

/**
 * Cabecera con la IP real del cliente, para los límites por cliente del backend. El backend solo le
 * cree si viene junto con {@link PROXY_SECRET_HEADER}: en Vercel y Render no puede confiar por la
 * dirección de quien llama (las IP de salida de Vercel no son fijas).
 */
export const CLIENT_IP_HEADER = 'x-galpon-client-ip'

/**
 * Cabecera con la que un proxy sin código (el del dashboard en Vercel) le dice al backend de dónde
 * sacar la IP del cliente. La tienda no la manda, pero tampoco deja que la mande el navegador.
 */
export const CLIENT_IP_FROM_HEADER = 'x-galpon-client-ip-from'

/**
 * Cabeceras propias que solo puede escribir el servidor de la tienda: si las manda el navegador, se
 * borran antes de seguir.
 */
export const PROXY_ONLY_HEADERS = [
  PROXY_SECRET_HEADER,
  CLIENT_IP_HEADER,
  CLIENT_IP_FROM_HEADER,
] as const

/** Cabeceras de un pedido entrante: alcanza con leer una por nombre (`Headers` o `headers()` de Next). */
export interface HeaderReader {
  /** Valor de la cabecera, o `null` si no vino. */
  get: (name: string) => string | null
}

/**
 * IP del cliente según la cabecera de confianza (`TRUSTED_CLIENT_IP_HEADER`): la que escribe el
 * proxy de la plataforma (CDN o balanceador) pisando lo que mande el navegador. La usan el proxy de
 * `/api/v1` y las lecturas de la cuenta que hace el servidor, para mandarle al backend
 * `X-Forwarded-For` con la IP real: si no, el backend las cuenta todas como de la tienda.
 *
 * @param headers - Cabeceras del pedido entrante.
 * @param trustedHeader - Nombre de la cabecera de confianza, en minúsculas; `null` si no se configuró.
 * @returns La IP sin espacios en los bordes, o `null` sin cabecera de confianza o si vino vacía.
 * @example
 * trustedClientIp(new Headers({ 'cf-connecting-ip': ' 198.51.100.4 ' }), 'cf-connecting-ip')
 * // '198.51.100.4'
 */
export function trustedClientIp(
  headers: HeaderReader,
  trustedHeader: string | null,
): string | null {
  if (trustedHeader === null) return null
  const value = (headers.get(trustedHeader) ?? '').trim()
  return value === '' ? null : value
}
