import type { z } from 'zod'

/**
 * Convierte los errores de Zod en un mensaje por campo, listo para mostrar en el formulario.
 *
 * La clave es el camino del campo unido con puntos (`address.street`, `items.0.name`); un error
 * que no es de ningún campo queda en la clave vacía. Si un campo tiene varios errores, gana el
 * primero.
 *
 * @param error - Error que devuelve `safeParse` cuando los datos no cumplen el schema.
 * @returns Mensaje en español de cada campo con error.
 * @example
 * const result = shippingSchema.safeParse(data)
 * if (!result.success) toFieldErrors(result.error) // { 'address.street': 'Requerido' }
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const messages = new Map<string, string>()
  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.')
    if (!messages.has(field)) messages.set(field, issue.message)
  }
  return Object.fromEntries(messages)
}
