/** Marcas diacríticas (tildes, diéresis, tilde de la eñe) que quedan sueltas tras `normalize('NFD')`. */
const DIACRITICS = /\p{Diacritic}/gu

/** Quita los acentos y demás marcas diacríticas de un texto. */
function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '')
}

/**
 * Normaliza un texto para buscar: sin acentos, en minúsculas y con los espacios colapsados.
 *
 * @param text - Texto original (nombre, descripción o lo que escribió la persona).
 * @returns El texto normalizado, sin espacios al principio ni al final.
 * @example
 * normalizeSearchText('  BOMBILLÓN   Curvo ') // "bombillon curvo"
 */
export function normalizeSearchText(text: string): string {
  return stripDiacritics(text).toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Indica si una búsqueda coincide con alguno de los textos de un producto.
 *
 * Busca la consulta entera (normalizada) dentro de los campos unidos con espacios,
 * así "te y jengibre" encuentra "Té y Jengibre" y "bombillon" encuentra "Bombillón".
 *
 * @param query - Lo que escribió la persona; vacío encuentra todo.
 * @param fields - Textos donde buscar (por ejemplo nombre, descripción y línea).
 * @returns `true` si la consulta aparece en los campos.
 * @example
 * matchesSearch('BOMBILLÓN', ['Bombillón Curvo']) // true
 */
export function matchesSearch(query: string, fields: readonly string[]): boolean {
  return normalizeSearchText(fields.join(' ')).includes(normalizeSearchText(query))
}

/**
 * Convierte un texto en un slug para URLs: minúsculas, sin acentos y con guiones.
 *
 * @param text - Texto original (por ejemplo el nombre de un producto).
 * @returns El slug, sin guiones al principio ni al final; vacío si no queda ningún carácter válido.
 * @example
 * slugify('Yerba Canarias Té y Jengibre 1 kg') // "yerba-canarias-te-y-jengibre-1-kg"
 */
export function slugify(text: string): string {
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
