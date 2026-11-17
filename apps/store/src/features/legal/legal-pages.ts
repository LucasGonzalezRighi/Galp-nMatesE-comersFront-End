import type { LegalDocument } from '@galpon/domain'

/** Ruta de la tienda de cada documento legal. */
export type LegalPath = '/terminos' | '/privacidad' | '/cookies' | '/devoluciones'

/** Ruta y descripción (para los buscadores y para compartir) de una página legal. */
export interface LegalPageInfo {
  /** Ruta de la página en la tienda. */
  path: LegalPath
  /** Descripción de la página (el título sale del documento, que es editable). */
  description: string
}

/** Ruta y descripción de cada documento legal. */
export const LEGAL_PAGES: Readonly<Record<LegalDocument, LegalPageInfo>> = {
  terms: {
    path: '/terminos',
    description: 'Condiciones de compra, envío, cambios y devoluciones de Galpón Mates.',
  },
  privacy: {
    path: '/privacidad',
    description: 'Cómo cuidamos y usamos tus datos personales en Galpón Mates.',
  },
  cookies: {
    path: '/cookies',
    description: 'Qué cookies y qué almacenamiento del navegador usa Galpón Mates, y para qué.',
  },
  returns: {
    path: '/devoluciones',
    description: 'Arrepentimiento, garantía legal, cambios y reembolsos en Galpón Mates.',
  },
}
