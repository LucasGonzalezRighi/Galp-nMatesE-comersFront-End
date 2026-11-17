/** Largo máximo de un slug (el del contrato): también el de las etiquetas de caché `product:{slug}`. */
export const SLUG_MAX_LENGTH = 80

/** Forma de un slug del contrato: minúsculas y números separados por guiones sueltos. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Indica si el texto tiene la forma de un slug del contrato (productos y líneas): minúsculas y
 * números separados por guiones sueltos, de hasta {@link SLUG_MAX_LENGTH} caracteres. Se usa antes
 * de leer o de generar una página, para que un texto cualquiera de la URL (mayúsculas, `..`, `%`)
 * no llegue a la API, no arme una etiqueta de caché ni deje una página guardada.
 *
 * @param slug - Lo que vino en la dirección, sin confiar en su forma.
 * @returns `true` si tiene la forma de un slug.
 * @example
 * isSlugShaped('mate-imperial') // true
 * isSlugShaped('Mate%20Imperial') // false
 */
export function isSlugShaped(slug: string): boolean {
  return slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug)
}
