/** Microtextos de Nosotros que no vienen del contenido editable de la API. */
export const ABOUT_COPY = {
  /** Texto del marco cuando el socio todavía no tiene foto ("Foto · Bruno Galimberti"). */
  photoPlaceholder: (name: string): string => `Foto · ${name}`,
  /** Texto alternativo de la foto de un socio que no trae uno propio. */
  photoAlt: (name: string): string => `Foto de ${name}`,
} as const
