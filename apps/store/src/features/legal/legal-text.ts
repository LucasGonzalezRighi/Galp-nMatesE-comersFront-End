import { formatDate } from '@galpon/domain'

/**
 * Separa el texto de un documento legal en párrafos: el contenido separa los párrafos con una
 * línea en blanco. Los espacios de los bordes y los párrafos vacíos se descartan.
 *
 * @param body - Texto del documento.
 * @returns Los párrafos, en orden.
 * @example
 * splitParagraphs('Primero.\n\nSegundo.') // ["Primero.", "Segundo."]
 */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\r?\n[^\S\r\n]*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
}

/**
 * Fecha de la última actualización de un documento, como `dd/mm/aaaa`.
 *
 * El contenido trae solo el día (`2026-10-01`): se toma el mediodía de Buenos Aires para que la
 * zona horaria no corra el día.
 *
 * @param updatedAt - Día en formato `aaaa-mm-dd`.
 * @throws {RangeError} Si no es un día válido.
 * @example
 * formatUpdatedAt('2026-10-01') // "01/10/2026"
 */
export function formatUpdatedAt(updatedAt: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
    throw new RangeError(
      `La fecha de actualización tiene que ser aaaa-mm-dd; se recibió ${JSON.stringify(updatedAt)}.`,
    )
  }
  return formatDate(`${updatedAt}T12:00:00-03:00`)
}
