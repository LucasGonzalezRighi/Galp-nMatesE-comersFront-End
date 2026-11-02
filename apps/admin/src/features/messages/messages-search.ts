import { z } from 'zod'
import type { AdminMessageQuery, ContactMessageKind } from '@galpon/api-client'

/** Tipo de mensaje como va en la URL (`?tipo=`); sin tipo se ven todos. */
export type MessagesKindFilter = 'contacto' | 'arrepentimiento'

/** Los tipos que se pueden filtrar, en el orden de las pestañas. */
export const MESSAGES_KIND_FILTERS = [
  'contacto',
  'arrepentimiento',
] as const satisfies readonly MessagesKindFilter[]

/** Tipo de la API que corresponde a cada filtro. */
export const MESSAGES_FILTER_KIND: Readonly<Record<MessagesKindFilter, ContactMessageKind>> = {
  contacto: 'contact',
  arrepentimiento: 'withdrawal',
}

/** Búsqueda de `/mensajes`: tipo, "solo sin leer" y página. */
export interface MessagesSearch {
  /** Tipo de mensaje; sin él, todos. */
  tipo?: MessagesKindFilter
  /** `1` deja solo los mensajes sin leer (`?sinLeer=1`). */
  sinLeer?: 1
  /** Página, desde 1. */
  pagina: number
}

/** Valores por omisión de {@link MessagesSearch}: la ruta los saca de la URL. */
export const MESSAGES_SEARCH_DEFAULTS = { pagina: 1 } as const satisfies MessagesSearch

/**
 * Valida `?tipo=`, `?sinLeer=` y `?pagina=` de `/mensajes`. Lo que no sirve se descarta (todos los
 * tipos, leídos y no leídos, página 1), así una dirección mal escrita nunca rompe la pantalla.
 */
export const messagesSearchSchema = z.object({
  tipo: z.enum(MESSAGES_KIND_FILTERS).optional().catch(undefined),
  sinLeer: z.literal(1).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).catch(MESSAGES_SEARCH_DEFAULTS.pagina),
}) satisfies z.ZodType<MessagesSearch>

/**
 * Traduce la búsqueda de la URL a la consulta de `GET /admin/messages`.
 *
 * @param search - Búsqueda ya validada.
 * @returns Tipo (`kind`), `read: false` con "solo sin leer" y la página.
 * @throws {RangeError} Si la página no es un entero mayor o igual a 1.
 * @example
 * messagesQueryOf({ tipo: 'contacto', sinLeer: 1, pagina: 1 })
 * // { kind: 'contact', read: false, page: 1 }
 */
export function messagesQueryOf(search: MessagesSearch): AdminMessageQuery {
  if (!Number.isInteger(search.pagina) || search.pagina < 1) {
    throw new RangeError(
      `La página tiene que ser un entero mayor o igual a 1; se recibió ${String(search.pagina)}.`,
    )
  }
  return {
    ...(search.tipo === undefined ? {} : { kind: MESSAGES_FILTER_KIND[search.tipo] }),
    ...(search.sinLeer === 1 ? { read: false } : {}),
    page: search.pagina,
  }
}
