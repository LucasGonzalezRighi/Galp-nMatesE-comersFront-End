import { isApiError } from '@galpon/api-client'

/** Qué mostrar cuando falla el envío del formulario. */
export interface SubmitFailure {
  /** Mensaje de cada campo con error, por nombre de campo. */
  fieldErrors: Record<string, string>
  /** Mensaje general del formulario, o `null` si todo el error quedó en los campos. */
  message: string | null
}

/** Mensajes generales que se muestran según la causa. */
export interface SubmitFailureMessages {
  /** No hubo respuesta (sin conexión, corte). */
  network: string
  /** Falla que no vino de la API. */
  unexpected: string
}

/**
 * Convierte el error de un envío en lo que se muestra en el formulario: la API informa por campo
 * los datos que no pasaron la validación (`422`), y cualquier otra falla se muestra como un
 * mensaje general (red, demasiados envíos, servidor).
 *
 * @param error - Lo que lanzó la llamada a la API.
 * @param fields - Campos del formulario; el error de un campo desconocido va al mensaje general.
 * @param messages - Mensajes generales para la red y para lo inesperado.
 */
export function describeSubmitError(
  error: unknown,
  fields: readonly string[],
  messages: SubmitFailureMessages,
): SubmitFailure {
  if (!isApiError(error)) return { fieldErrors: {}, message: messages.unexpected }
  if (error.kind === 'network') return { fieldErrors: {}, message: messages.network }
  const fieldErrors: Record<string, string> = {}
  let message: string | null = null
  for (const [field, text] of Object.entries(error.fieldErrors)) {
    if (fields.includes(field)) fieldErrors[field] = text
    else message ??= text
  }
  if (Object.keys(fieldErrors).length === 0) message ??= error.message
  return { fieldErrors, message }
}
