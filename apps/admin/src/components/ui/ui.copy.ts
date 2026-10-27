/** Textos de los componentes de formularios, estados y estructura de pantalla de `components/ui`. */
export const UI_COPY = {
  /** Botón de `ErrorState` que vuelve a pedir los datos. */
  retry: 'Reintentar',
  /** Aviso de `FormActions` cuando el formulario tiene cambios. */
  unsavedChanges: 'Cambios sin guardar',
  /** Botón de `FormActions` que vuelve a los valores guardados. */
  discard: 'Descartar',
  /** Texto por defecto del botón principal de `FormActions`. */
  saveChanges: 'Guardar cambios',
  /** Botón principal de `FormActions` mientras se guarda. */
  saving: 'Guardando…',
  /** Sufijo de `document.title` que pone `PageHeader` ("Pedidos · Galpón Admin"). */
  documentTitleSuffix: ' · Galpón Admin',
} as const

/**
 * Arma el contador de caracteres de `Textarea`.
 *
 * @param count - Caracteres escritos.
 * @param max - Máximo permitido.
 * @returns El contador, por ejemplo "45 / 160".
 * @throws {RangeError} Si `count` no es un entero mayor o igual a 0 o `max` no es un entero mayor a 0.
 * @example
 * characterCountText(45, 160) // "45 / 160"
 */
export function characterCountText(count: number, max: number): string {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError(
      `La cantidad de caracteres tiene que ser un entero mayor o igual a 0; se recibió ${String(count)}.`,
    )
  }
  if (!Number.isSafeInteger(max) || max <= 0) {
    throw new RangeError(
      `El máximo de caracteres tiene que ser un entero mayor a 0; se recibió ${String(max)}.`,
    )
  }
  return `${String(count)} / ${String(max)}`
}
