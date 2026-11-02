/** Estado de la carga de una página de contenido. */
export type ContentLoadState = 'pending' | 'error' | 'success'

/** Lo que hace falta de una consulta de React Query para saber en qué estado está. */
export interface QueryStatusLike {
  /** `true` mientras no hay datos. */
  isPending: boolean
  /** `true` si falló (incluida una recarga en segundo plano que falló con datos ya cargados). */
  isError: boolean
  /** Los datos, o `undefined` si todavía no llegaron: una recarga que falla los conserva. */
  data: unknown
}

/**
 * Estado de una pantalla que necesita varias consultas: error si alguna falló sin tener datos,
 * cargando si alguna todavía no los tiene y listo si todas los tienen. Una recarga en segundo
 * plano que falla (sesión vencida, corte de red) no cuenta como error mientras haya datos: así
 * el formulario no se desmonta con lo escrito.
 *
 * @param queries - Las consultas de la pantalla.
 * @returns `error`, `pending` o `success`.
 * @throws {RangeError} Si no recibe ninguna consulta.
 */
export function combinedLoadState(queries: readonly QueryStatusLike[]): ContentLoadState {
  if (queries.length === 0) {
    throw new RangeError('Hace falta al menos una consulta para saber el estado de la pantalla.')
  }
  if (queries.some((query) => query.isError && query.data === undefined)) return 'error'
  if (queries.some((query) => query.isPending)) return 'pending'
  return 'success'
}
