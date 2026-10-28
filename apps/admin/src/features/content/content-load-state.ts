/** Estado de la carga de una página de contenido. */
export type ContentLoadState = 'pending' | 'error' | 'success'

/** Lo que hace falta de una consulta de React Query para saber en qué estado está. */
export interface QueryStatusLike {
  /** `true` mientras no hay datos. */
  isPending: boolean
  /** `true` si falló. */
  isError: boolean
}

/**
 * Estado de una pantalla que necesita varias consultas: error si alguna falló, cargando si
 * alguna todavía no tiene datos y listo si todas los tienen.
 *
 * @param queries - Las consultas de la pantalla.
 * @returns `error`, `pending` o `success`.
 * @throws {RangeError} Si no recibe ninguna consulta.
 */
export function combinedLoadState(queries: readonly QueryStatusLike[]): ContentLoadState {
  if (queries.length === 0) {
    throw new RangeError('Hace falta al menos una consulta para saber el estado de la pantalla.')
  }
  if (queries.some((query) => query.isError)) return 'error'
  if (queries.some((query) => query.isPending)) return 'pending'
  return 'success'
}
