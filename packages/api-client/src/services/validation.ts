/** Patrón del slug del contrato (`docs/api/openapi.yaml`): minúsculas y números separados por guiones sueltos. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Largo máximo del slug, como en el contrato. */
const SLUG_MAX_LENGTH = 80

/**
 * Comprueba que el slug de un producto cumpla el patrón y el largo del contrato.
 *
 * Así un `'.'` o un `'..'` no llegan a la ruta (`/products/..` apuntaría a otro recurso) y los
 * slugs inválidos fallan acá, sin ir a la red.
 *
 * @param slug - Slug del producto.
 * @throws {RangeError} Si está vacío o son solo espacios, o si no cumple
 *   `^[a-z0-9]+(?:-[a-z0-9]+)*$` o pasa de 80 caracteres.
 */
export function assertSlug(slug: string): void {
  if (slug.trim() === '') throw new RangeError('El slug del producto no puede estar vacío')
  if (slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) {
    throw new RangeError(
      'El slug del producto tiene que tener minúsculas, números y guiones sueltos, hasta 80 caracteres',
    )
  }
}

/**
 * Comprueba que un número de página sea un entero mayor o igual a 1.
 *
 * @param page - Número de página, empezando en 1.
 * @throws {RangeError} Si no es un entero mayor o igual a 1.
 */
export function assertPage(page: number): void {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError('La página tiene que ser un entero mayor o igual a 1')
  }
}
