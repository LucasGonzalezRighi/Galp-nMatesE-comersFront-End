/** Microtextos del buscador, tal como están en el diseño y en el spec (9.5 y 9.7). */
export const SEARCH_COPY = {
  /** Nombre del diálogo (solo para lectores de pantalla). */
  title: 'Buscar',
  /** Texto del campo vacío. */
  placeholder: 'Buscá un mate, bombilla o yerba…',
  /** Nombre accesible del campo. */
  inputLabel: 'Buscar',
  /** Nombre accesible del botón que cierra el buscador. */
  close: 'Cerrar búsqueda',
  /** Nombre accesible del grupo de líneas que se muestra con el campo vacío. */
  lines: 'Líneas',
  /** Nombre accesible de la lista de resultados. */
  results: 'Resultados',
  /** Link que lleva a la tienda con la búsqueda. */
  seeAll: 'Ver todos los resultados en la tienda',
  /** Anuncio mientras carga el catálogo la primera vez. */
  loading: 'Cargando el catálogo',
  /** Aviso cuando no se pudo cargar el catálogo (spec 9.7). */
  error: 'No pudimos buscar, probá de nuevo',
  /** Botón que vuelve a pedir el catálogo. */
  retry: 'Reintentar',
} as const

/**
 * Aviso de una búsqueda sin coincidencias, con la consulta entre comillas tipográficas.
 *
 * @param query - Lo que escribió la persona.
 * @returns Por ejemplo `Sin resultados para “termo”.`.
 */
export function noResultsText(query: string): string {
  return `Sin resultados para “${query}”.`
}
