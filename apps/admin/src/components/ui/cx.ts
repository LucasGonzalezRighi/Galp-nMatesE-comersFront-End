/** Fragmento de clases que se ignora si es falso, nulo o vacío. */
export type ClassValue = string | false | null | undefined

/**
 * Une clases de CSS descartando las vacías.
 *
 * No resuelve conflictos entre utilidades de Tailwind: cada componente arma sus clases sin
 * repetir propiedades, y `className` solo se usa para sumar disposición (ancho, márgenes).
 *
 * @param values - Fragmentos de clases; los falsos, nulos y vacíos se descartan.
 * @returns Las clases separadas por un espacio.
 * @example
 * cx('flex', isOpen && 'gap-2', undefined) // "flex gap-2"
 */
export function cx(...values: readonly ClassValue[]): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value !== '')
    .join(' ')
}
