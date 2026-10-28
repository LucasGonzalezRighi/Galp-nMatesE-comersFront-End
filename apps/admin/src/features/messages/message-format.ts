import type { ContactMessage } from '@galpon/api-client'
import { MESSAGES_COPY, withdrawalSubject } from './messages.copy'

/**
 * Enlace `mailto:` para responder un mensaje, con el asunto que corresponde a su tipo: "Tu
 * consulta a Galpón Mates" o "Tu solicitud de arrepentimiento {código}".
 *
 * @param message - Email, tipo y código del mensaje.
 * @returns El enlace, con el asunto codificado.
 * @throws {RangeError} Si el email está vacío o un arrepentimiento no tiene código.
 * @example
 * replyMailto({ email: 'ana@example.com', kind: 'contact', code: null })
 * // "mailto:ana@example.com?subject=Tu%20consulta%20a%20Galp%C3%B3n%20Mates"
 */
export function replyMailto(message: Pick<ContactMessage, 'email' | 'kind' | 'code'>): string {
  if (message.email.trim() === '') {
    throw new RangeError('El email del mensaje no puede estar vacío.')
  }
  const subject =
    message.kind === 'withdrawal'
      ? withdrawalSubject(message.code ?? '')
      : MESSAGES_COPY.contactSubject
  return `mailto:${message.email}?subject=${encodeURIComponent(subject)}`
}

/**
 * Separa un texto que escribió un cliente en párrafos: uno por renglón, sin los espacios de los
 * bordes ni los renglones vacíos.
 *
 * @param text - Texto del mensaje.
 * @returns Los párrafos, en orden (vacío si no hay texto).
 * @example
 * toParagraphs('Hola.\n¿Cómo va?') // ["Hola.", "¿Cómo va?"]
 */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
}
