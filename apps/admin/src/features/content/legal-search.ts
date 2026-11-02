import { z } from 'zod'
import type { LegalDocument } from '@galpon/api-client'

/** Documento legal como va en la URL de Legales (`?documento=`). */
export type LegalTab = 'terminos' | 'privacidad'

/** Los documentos, en el orden de las pestañas. */
export const LEGAL_TABS = ['terminos', 'privacidad'] as const satisfies readonly LegalTab[]

/** Documento de la API que edita cada pestaña. */
export const LEGAL_TAB_DOCUMENTS: Readonly<Record<LegalTab, LegalDocument>> = {
  terminos: 'terms',
  privacidad: 'privacy',
}

/** Búsqueda de `/contenido/legales`. */
export interface LegalSearch {
  /** Documento elegido. */
  documento: LegalTab
}

/** Valores por omisión de {@link LegalSearch}: la ruta los saca de la URL. */
export const LEGAL_SEARCH_DEFAULTS = { documento: 'terminos' } as const satisfies LegalSearch

/**
 * Valida `?documento=` de `/contenido/legales`. Lo que no sirve vuelve a los términos y
 * condiciones, así una dirección mal escrita nunca rompe la pantalla.
 */
export const legalSearchSchema = z.object({
  documento: z.enum(LEGAL_TABS).catch(LEGAL_SEARCH_DEFAULTS.documento),
}) satisfies z.ZodType<LegalSearch>
