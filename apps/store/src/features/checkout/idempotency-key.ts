/** Largo de cada grupo de dígitos hexadecimales de un UUID en texto. */
const UUID_GROUPS = [8, 4, 4, 4, 12] as const

/**
 * Genera la `Idempotency-Key` de un intento (`POST /orders` y los dos endpoints de pago): un UUID
 * v4 al azar.
 *
 * Usa `crypto.randomUUID`, que solo existe en contextos seguros (HTTPS o `localhost`); quien prueba
 * la tienda por la red local con `http://192.168.x.x` no la tiene, y ahí el UUID se arma con
 * `crypto.getRandomValues`. (El de la API simulada no se usa: el modo de prueba queda fuera del
 * bundle en vivo.)
 *
 * @returns Un UUID v4 en minúsculas, por ejemplo `3b241101-e2bb-4255-8caf-4136c566a962`.
 */
export function newIdempotencyKey(): string {
  // El tipo dice que siempre existe, pero en un contexto no seguro falta: se mira al ejecutar.
  const native = (crypto as Partial<Crypto>).randomUUID
  if (typeof native === 'function') return native.call(crypto)
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  // Versión 4 en el byte 6 y variante RFC 4122 en el byte 8.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  let start = 0
  return UUID_GROUPS.map((size) => {
    const group = hex.slice(start, start + size)
    start += size
    return group
  }).join('-')
}
