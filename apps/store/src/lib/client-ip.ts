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
