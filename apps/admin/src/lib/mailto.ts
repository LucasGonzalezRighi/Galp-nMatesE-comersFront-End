/** Campos opcionales del borrador de un enlace `mailto:`. */
export interface MailtoFields {
  /** Asunto del mail. */
  subject?: string
  /** Cuerpo del mail. */
  body?: string
}

/**
 * Arma un enlace `mailto:` con todo codificado (`encodeURIComponent`): el destinatario, el asunto y
 * el cuerpo. El email viene de la API y lo escribió un cliente, así que un `?`, `&`, `=` o `%`
 * dentro de él no puede agregar campos al borrador (copias, otro asunto, otro cuerpo).
 *
 * @param to - Email del destinatario.
 * @param fields - Asunto y cuerpo, si hacen falta.
 * @returns El enlace, por ejemplo `mailto:ana%40example.com?subject=Hola`.
 * @throws {RangeError} Si el destinatario está vacío.
 * @example
 * buildMailto('ana@example.com', { subject: 'Tu consulta' })
 * // "mailto:ana%40example.com?subject=Tu%20consulta"
 */
export function buildMailto(to: string, fields: MailtoFields = {}): string {
  if (to.trim() === '') {
    throw new RangeError('El destinatario del enlace mailto: no puede estar vacío.')
  }
  const query = Object.entries(fields)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('&')
  return `mailto:${encodeURIComponent(to)}${query === '' ? '' : `?${query}`}`
}
