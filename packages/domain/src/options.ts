/** Cueros disponibles para los mates, en el orden en que se muestran. */
export const LEATHERS = ['Negro', 'Marrón', 'Crudo', 'Borravino'] as const

/** Cuero de un mate. */
export type Leather = (typeof LEATHERS)[number]

/** Cuero que viene elegido de entrada. */
export const DEFAULT_LEATHER: Leather = 'Negro'

/** Virolas disponibles para los mates, en el orden en que se muestran. */
export const FERRULES = ['Alpaca lisa', 'Alpaca cincelada', 'Acero'] as const

/** Virola de un mate. */
export type Ferrule = (typeof FERRULES)[number]

/** Virola que viene elegida de entrada. */
export const DEFAULT_FERRULE: Ferrule = 'Alpaca cincelada'

/** Virola de los mates dentro de un kit: en el kit siempre es esta. */
export const KIT_FERRULE: Ferrule = 'Alpaca cincelada'

/**
 * Indica si un texto es uno de los cueros disponibles.
 *
 * @param value - Texto a revisar; se compara exacto, con mayúsculas y acentos.
 * @returns `true` si es un {@link Leather}.
 */
export function isLeather(value: string): value is Leather {
  return (LEATHERS as readonly string[]).includes(value)
}

/**
 * Indica si un texto es una de las virolas disponibles.
 *
 * @param value - Texto a revisar; se compara exacto, con mayúsculas y acentos.
 * @returns `true` si es un {@link Ferrule}.
 */
export function isFerrule(value: string): value is Ferrule {
  return (FERRULES as readonly string[]).includes(value)
}
