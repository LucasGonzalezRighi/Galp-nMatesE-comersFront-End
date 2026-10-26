/** Microtextos de las reseñas, tal como están en el diseño y en el spec (9.5 y 9.7). */
export const REVIEWS_COPY = {
  /** Texto pequeño sobre el promedio. */
  eyebrow: 'Reseñas',
  /** Lo que sigue al promedio ("4,7 / 5"). */
  outOfFive: '/ 5',
  /** Promedio cuando todavía no hay reseñas. */
  noAverage: '—',
  /** Contador cuando todavía no hay reseñas. */
  noneYet: 'Todavía no hay reseñas',
  /** Listado vacío. */
  empty: 'Todavía no hay reseñas de este producto. Sé el primero en contar cómo te fue.',
  /** Nombre accesible de la distribución por puntuación. */
  distributionLabel: 'Reseñas por puntuación',
  /** Etiqueta de una reseña de alguien que compró el producto. */
  verified: 'Compra verificada',
  /** Botón que abre y cierra el formulario. */
  write: 'Escribir una reseña',
  /** Nombre accesible de las estrellas del formulario. */
  ratingLegend: 'Puntuación',
  /** Texto que acompaña a las estrellas mientras no se elige ninguna. */
  pickRating: 'Elegí una puntuación',
  /** Etiqueta del campo del nombre. */
  name: 'Nombre',
  /** Pista del campo del nombre. */
  namePlaceholder: 'Cómo querés que aparezca',
  /** Etiqueta del campo del texto. */
  text: 'Reseña',
  /** Pista del campo del texto. */
  textPlaceholder: 'Calidad, terminaciones, envío…',
  /** Nombre accesible del campo trampa contra bots. */
  honeypot: 'No completar este campo',
  /** Aviso de privacidad (spec 14.6): lo que se hace con los datos, antes del link. */
  privacyBefore: 'Usamos tu nombre y tu reseña solo para publicarla en esta página. Más en nuestra',
  /** Texto del link a la política de privacidad. */
  privacyLink: 'Política de privacidad',
  /** Botón que cierra el formulario sin enviar. */
  cancel: 'Cancelar',
  /** Botón que envía la reseña. */
  submit: 'Publicar reseña',
  /** Botón mientras se envía. */
  sending: 'Enviando…',
  /** Confirmación del envío (la reseña queda pendiente de revisión). */
  thanks: 'Gracias, tu reseña se publica cuando la revisemos',
  /** Botón que cierra la confirmación. */
  close: 'Cerrar',
  /** Error de red o de servidor al enviar (spec 9.7). */
  networkError: 'No pudimos conectar, probá de nuevo',
} as const

/**
 * Título del formulario.
 *
 * @param productName - Nombre del producto reseñado.
 * @returns "Tu reseña de {nombre}".
 */
export function reviewFormTitle(productName: string): string {
  return `Tu reseña de ${productName}`
}

/**
 * Nombre accesible de una estrella del formulario.
 *
 * @param stars - Puntuación de 1 a 5.
 * @returns "1 estrella" o "N estrellas".
 */
export function starLabel(stars: number): string {
  return `${String(stars)} ${stars === 1 ? 'estrella' : 'estrellas'}`
}
