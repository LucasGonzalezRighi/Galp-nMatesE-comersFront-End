/** Microtextos de las páginas legales. */
export const LEGAL_COPY = {
  /** Rótulo sobre el título. */
  eyebrow: 'Legales',
  /** Fecha de la última actualización ("Última actualización: 01/10/2026"). */
  updatedAt: (date: string): string => `Última actualización: ${date}`,
} as const
