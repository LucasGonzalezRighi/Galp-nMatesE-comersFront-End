import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@galpon/api-client'
import { ACCOUNT_COPY } from './account.copy'

/**
 * Muestra en el formulario el error de un envío: los campos que la API marcó (`422`) quedan con
 * su mensaje y lo demás va al mensaje general (`root.server`): "No pudimos conectar, probá de
 * nuevo" sin red, o el mensaje de la API.
 *
 * @param error - Lo que lanzó la llamada a la API.
 * @param fields - Campos del formulario; el error de otro campo va al mensaje general.
 * @param setError - `setError` del formulario.
 */
export function showSubmitError<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): void {
  if (!isApiError(error)) {
    setError('root.server', { message: ACCOUNT_COPY.unexpectedError })
    return
  }
  if (error.kind === 'network') {
    setError('root.server', { message: ACCOUNT_COPY.networkError })
    return
  }
  let general: string | null = null
  let marked = false
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    const known = fields.find((candidate) => candidate === field)
    if (known === undefined) {
      general ??= message
    } else {
      setError(known, { message }, { shouldFocus: !marked })
      marked = true
    }
  }
  if (general !== null || !marked) {
    setError('root.server', { message: general ?? error.message })
  }
}
