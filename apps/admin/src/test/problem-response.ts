/** Un error de un campo, como los del `422` del contrato. */
export interface ProblemFieldError {
  /** Ruta del campo, con punto e índice (`images.0.alt`). */
  field: string
  /** Mensaje para mostrar. */
  message: string
}

/**
 * Respuesta `422` (`application/problem+json`) como las de la API, para que un middleware del
 * cliente (`app.api.use({ onRequest })`) la devuelva sin llegar a la API simulada.
 *
 * @param errors - Un error por campo.
 * @param detail - Mensaje general (el `message` del `ApiError`); por omisión "Revisá los campos
 *   marcados.".
 * @returns Una respuesta nueva en cada llamada (el cuerpo de una `Response` se lee una sola vez).
 * @throws {RangeError} Si un campo o un mensaje está vacío.
 * @example
 * app.api.use({
 *   onRequest: ({ request }) =>
 *     request.method === 'PUT' ? validationProblem([{ field: 'x', message: 'Mal.' }]) : undefined,
 * })
 */
export function validationProblem(
  errors: readonly ProblemFieldError[],
  detail = 'Revisá los campos marcados.',
): Response {
  for (const error of errors) {
    if (error.field.trim() === '' || error.message.trim() === '') {
      throw new RangeError('Cada error de campo necesita su ruta y su mensaje.')
    }
  }
  const body = {
    type: 'validation_error',
    title: 'Los datos no son válidos',
    status: 422,
    detail,
    errors,
  }
  return new Response(JSON.stringify(body), {
    status: 422,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}
