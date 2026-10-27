/**
 * Textos de la segunda mitad del kit de interfaz del dashboard: diálogos, menús, tablas,
 * paginación, avisos, reordenamiento y fotos.
 */
export const OVERLAY_COPY = {
  /** Nombre accesible del botón que cierra un diálogo. */
  close: 'Cerrar',
  /** Botón de cancelar de un diálogo de confirmación (por omisión). */
  cancel: 'Cancelar',
  /** Botón para volver a intentar algo que falló. */
  retry: 'Reintentar',
  /** Aviso para lectores de pantalla de un enlace que abre otra pestaña. */
  opensInNewTab: '(se abre en otra pestaña)',
  /** Paginación: nombre del `nav` y sus botones. */
  pagination: 'Paginación',
  previous: 'Anterior',
  next: 'Siguiente',
  /** Avisos: nombre de la región (Radix cambia `{hotkey}` por el atajo), prefijo y cierre. */
  toastRegion: 'Avisos ({hotkey})',
  toastLabel: 'Aviso',
  closeToast: 'Cerrar aviso',
  /** Diálogo de `UnsavedChangesGuard`. */
  unsavedTitle: '¿Salir sin guardar?',
  unsavedDescription: 'Tenés cambios sin guardar en esta pantalla. Si salís, se pierden.',
  unsavedConfirm: 'Salir sin guardar',
  unsavedCancel: 'Seguir editando',
  /** Zona para elegir o soltar fotos, en plural y en singular. */
  dropzoneMultiple: 'Arrastrá fotos acá o elegí archivos',
  dropzoneSingle: 'Arrastrá una foto acá o elegí un archivo',
  chooseFiles: 'Elegir archivos',
  chooseFile: 'Elegir archivo',
  /** Miniatura de una foto. */
  mainPhoto: 'Principal',
  removePhoto: 'Quitar foto',
  remove: 'Quitar',
  cancelUpload: 'Cancelar',
  /** Campo de una sola foto. */
  changePhoto: 'Cambiar foto',
} as const

/**
 * Valida que un texto no esté vacío.
 *
 * @param value - Texto a revisar.
 * @param name - Qué es, para el mensaje de error.
 * @throws {RangeError} Si el texto está vacío o tiene solo espacios.
 */
function assertText(value: string, name: string): void {
  if (value.trim() === '') {
    throw new RangeError(`${name} no puede estar vacío.`)
  }
}

/**
 * Valida que un número sea un entero mayor o igual a un mínimo.
 *
 * @param value - Número a revisar.
 * @param min - Mínimo admitido.
 * @param name - Qué es, para el mensaje de error.
 * @throws {RangeError} Si no es un entero o es menor a `min`.
 */
function assertInteger(value: number, min: number, name: string): void {
  if (!Number.isInteger(value) || value < min) {
    throw new RangeError(
      `${name} tiene que ser un entero mayor o igual a ${String(min)}; se recibió ${String(value)}.`,
    )
  }
}

/**
 * Nombre accesible del botón que ordena una tabla por una columna.
 *
 * @param column - Nombre visible de la columna.
 * @returns Por ejemplo `Ordenar por Precio`.
 * @throws {RangeError} Si el nombre está vacío.
 */
export function sortBy(column: string): string {
  assertText(column, 'El nombre de la columna')
  return `Ordenar por ${column}`
}

/**
 * Rango de filas que muestra una página.
 *
 * @param from - Primera fila mostrada, desde 1.
 * @param to - Última fila mostrada, mayor o igual a `from`.
 * @param total - Total de filas, mayor o igual a `to`.
 * @returns Por ejemplo `Mostrando 21–40 de 45`.
 * @throws {RangeError} Si los números no son enteros o no cumplen `1 ≤ from ≤ to ≤ total`.
 */
export function showingRange(from: number, to: number, total: number): string {
  assertInteger(from, 1, 'La primera fila')
  assertInteger(to, from, 'La última fila')
  assertInteger(total, to, 'El total')
  return `Mostrando ${String(from)}–${String(to)} de ${String(total)}`
}

/**
 * Página actual sobre el total de páginas.
 *
 * @param page - Página actual, desde 1.
 * @param pages - Total de páginas, mayor o igual a `page`.
 * @returns Por ejemplo `Página 2 de 3`.
 * @throws {RangeError} Si no son enteros o `page` no está entre 1 y `pages`.
 */
export function pageOf(page: number, pages: number): string {
  assertInteger(page, 1, 'La página')
  assertInteger(pages, page, 'El total de páginas')
  return `Página ${String(page)} de ${String(pages)}`
}

/**
 * Progreso de una foto que se está subiendo.
 *
 * @param percent - Porcentaje entero de 0 a 100.
 * @returns Por ejemplo `Subiendo… 40 %`.
 * @throws {RangeError} Si no es un entero entre 0 y 100.
 */
export function uploadingProgress(percent: number): string {
  assertInteger(percent, 0, 'El progreso')
  if (percent > 100) {
    throw new RangeError(`El progreso no puede pasar de 100; se recibió ${String(percent)}.`)
  }
  return `Subiendo… ${String(percent)} %`
}

/**
 * Anuncio para lectores de pantalla después de mover un ítem de una lista.
 *
 * @param label - Nombre de la lista, por ejemplo `Fotos`.
 * @param position - Lugar en que quedó el ítem, desde 1.
 * @param total - Cantidad de ítems, mayor o igual a `position`.
 * @returns Por ejemplo `Fotos: quedó en el lugar 2 de 3.`
 * @throws {RangeError} Si el nombre está vacío o los números no cumplen `1 ≤ position ≤ total`.
 */
export function reorderAnnouncement(label: string, position: number, total: number): string {
  assertText(label, 'El nombre de la lista')
  assertInteger(position, 1, 'El lugar')
  assertInteger(total, position, 'El total')
  return `${label}: quedó en el lugar ${String(position)} de ${String(total)}.`
}
