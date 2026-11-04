/** Cueros disponibles para los mates, en el orden en que se muestran. */
export const LEATHERS = ['Negro', 'Marrón', 'Crudo', 'Borravino'] as const

/** Cuero de un mate. */
export type Leather = (typeof LEATHERS)[number]

/** Cuero que viene elegido de entrada si el mate lo ofrece. */
export const DEFAULT_LEATHER: Leather = 'Negro'

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
 * Elige el cuero con el que arranca el selector de un mate.
 *
 * @param leathers - Cueros que ofrece el mate.
 * @returns {@link DEFAULT_LEATHER} si se ofrece; si no, el primero; `null` si no ofrece ninguno.
 * @example
 * initialLeather(['Crudo', 'Negro']) // "Negro"
 * initialLeather(['Crudo', 'Borravino']) // "Crudo"
 * initialLeather([]) // null
 */
export function initialLeather(leathers: readonly Leather[]): Leather | null {
  if (leathers.includes(DEFAULT_LEATHER)) return DEFAULT_LEATHER
  return leathers[0] ?? null
}

/**
 * Deja una lista de cueros sin repetidos y en el orden de {@link LEATHERS}, como se guarda.
 *
 * @param leathers - Cueros en cualquier orden, quizás repetidos (no se modifica).
 * @returns Una lista nueva, sin repetidos y en el orden canónico.
 * @throws {RangeError} Si algún valor no es un {@link Leather}.
 * @example
 * normalizeLeathers(['Borravino', 'Negro', 'Negro']) // ["Negro", "Borravino"]
 */
export function normalizeLeathers(leathers: readonly Leather[]): Leather[] {
  for (const leather of leathers as readonly string[]) {
    if (!isLeather(leather)) {
      throw new RangeError(`"${leather}" no es un cuero; los cueros son ${LEATHERS.join(', ')}.`)
    }
  }
  return LEATHERS.filter((leather) => leathers.includes(leather))
}

/**
 * Decide el cuero de un mate a partir del que se eligió y de los que ofrece hoy.
 *
 * @param chosen - Cuero elegido antes, o `null` si no hay.
 * @param offered - Cueros que ofrece el mate.
 * @returns `chosen` si se ofrece; si no, {@link initialLeather} de `offered` (`null` sin cueros).
 * @example
 * resolveLeather('Borravino', ['Marrón', 'Crudo']) // "Marrón"
 * resolveLeather('Negro', []) // null
 */
export function resolveLeather(
  chosen: Leather | null,
  offered: readonly Leather[],
): Leather | null {
  if (chosen !== null && offered.includes(chosen)) return chosen
  return initialLeather(offered)
}
