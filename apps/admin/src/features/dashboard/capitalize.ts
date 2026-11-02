/**
 * Pone en mayúscula la primera letra de un texto ("martes 27 de octubre" → "Martes 27 de
 * octubre"), para los textos de `@galpon/domain` que vienen en minúscula.
 *
 * @param text - El texto.
 * @returns El texto con la primera letra en mayúscula.
 * @throws {RangeError} Si el texto está vacío.
 */
export function capitalizeFirst(text: string): string {
  if (text === '') {
    throw new RangeError('No se puede poner en mayúscula un texto vacío.')
  }
  return `${text.charAt(0).toLocaleUpperCase('es-AR')}${text.slice(1)}`
}
