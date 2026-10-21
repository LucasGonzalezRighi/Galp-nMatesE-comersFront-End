import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Etiquetas de caché que el backend puede pedir regenerar: `products`, `categories`, `settings`,
 * `product:{slug}`, `reviews:{slug}` y `content:{página}`.
 */
export const REVALIDATE_TAG_PATTERN =
  /^(products|categories|settings|product:[a-z0-9-]+|reviews:[a-z0-9-]+|content:[a-z-]+)$/

/** SHA-256 del texto: dos huellas del mismo largo se pueden comparar en tiempo constante. */
function fingerprint(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/**
 * Compara el secreto recibido en `x-revalidate-secret` con el esperado, en tiempo constante y
 * sin revelar el largo del secreto.
 *
 * @param provided - Valor de la cabecera, o `null` si no vino.
 * @param expected - El secreto configurado (`REVALIDATE_SECRET`).
 * @returns `true` solo si son iguales.
 * @throws {RangeError} Si `expected` está vacío: con un secreto vacío cualquiera pasaría.
 */
export function isValidRevalidateSecret(provided: string | null, expected: string): boolean {
  if (expected === '') {
    throw new RangeError(
      'isValidRevalidateSecret necesita el secreto esperado (no puede ser vacío).',
    )
  }
  if (provided === null) return false
  return timingSafeEqual(fingerprint(provided), fingerprint(expected))
}

/**
 * Perfil con el que se regenera una etiqueta: el contenido editable (`content:*`) pasa a
 * `'max'` (se sirve lo anterior mientras se regenera); precios, stock, productos, líneas y
 * ajustes vencen al instante, así el próximo visitante ya ve el dato nuevo.
 *
 * @param tag - Una etiqueta que cumpla {@link REVALIDATE_TAG_PATTERN}.
 * @returns El segundo argumento de `revalidateTag`.
 * @throws {RangeError} Si la etiqueta no es válida.
 */
export function revalidationProfileFor(tag: string): 'max' | { expire: 0 } {
  if (!REVALIDATE_TAG_PATTERN.test(tag)) {
    throw new RangeError(`La etiqueta de caché ${JSON.stringify(tag)} no es válida.`)
  }
  return tag.startsWith('content:') ? 'max' : { expire: 0 }
}
