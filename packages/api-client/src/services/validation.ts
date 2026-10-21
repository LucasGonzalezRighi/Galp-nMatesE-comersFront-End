/**
 * Comprueba que el slug de un producto no esté vacío.
 *
 * Solo descarta lo que no se puede convertir en una ruta; el formato del slug lo valida el
 * servidor, que responde `422` o `404` y llega como `ApiError`.
 *
 * @param slug - Slug del producto.
 * @throws {RangeError} Si está vacío o son solo espacios.
 */
export function assertSlug(slug: string): void {
  if (slug.trim() === '') throw new RangeError('El slug del producto no puede estar vacío')
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
