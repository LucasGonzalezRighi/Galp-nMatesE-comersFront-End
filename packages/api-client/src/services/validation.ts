import { isOrderNumber } from '@galpon/domain'

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

/** Formato de un UUID en texto, como la `Idempotency-Key` del contrato. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Identificador de una dirección de la libreta: letras, números, guiones y guiones bajos. */
const ADDRESS_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/

/**
 * Comprueba que un número de pedido tenga el formato del contrato (`GLP-` y cinco dígitos).
 *
 * @param number - Número del pedido.
 * @throws {RangeError} Si no cumple `isOrderNumber` de `@galpon/domain`.
 */
export function assertOrderNumber(number: string): void {
  if (!isOrderNumber(number)) {
    throw new RangeError('El número de pedido tiene que ser GLP- y cinco dígitos')
  }
}

/**
 * Comprueba que una `Idempotency-Key` sea un UUID.
 *
 * @param key - Clave del intento.
 * @throws {RangeError} Si no es un UUID.
 */
export function assertIdempotencyKey(key: string): void {
  if (!UUID_PATTERN.test(key)) {
    throw new RangeError('La Idempotency-Key tiene que ser un UUID')
  }
}

/**
 * Comprueba que el identificador de una dirección sirva para armar la ruta.
 *
 * @param id - Identificador de la dirección.
 * @throws {RangeError} Si está vacío, pasa de 80 caracteres o tiene algo que no sea letras,
 *   números, guiones o guiones bajos.
 */
export function assertAddressId(id: string): void {
  if (!ADDRESS_ID_PATTERN.test(id)) {
    throw new RangeError(
      'El identificador de la dirección tiene que tener letras, números o guiones, hasta 80 caracteres',
    )
  }
}
