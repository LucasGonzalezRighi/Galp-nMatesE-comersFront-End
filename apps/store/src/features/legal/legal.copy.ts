/** Microtextos de las páginas legales. */
export const LEGAL_COPY = {
  /** Rótulo sobre el título. */
  eyebrow: 'Legales',
  /** Fecha de la última actualización ("Última actualización: 01/10/2026"). */
  updatedAt: (date: string): string => `Última actualización: ${date}`,
  /** Botón que abre la impresión del navegador (LS-2: el documento se puede guardar). */
  print: 'Imprimir o guardar como PDF',
  /** Lo que se lee en lugar de un dato del vendedor que falta, fuera de producción (LA-2). */
  missingData: 'a completar por el vendedor',
  /** Aviso para lectores de pantalla en los enlaces externos. */
  newTab: '(se abre en otra pestaña)',
} as const
