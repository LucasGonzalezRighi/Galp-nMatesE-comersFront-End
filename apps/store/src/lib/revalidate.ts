import { secretMatches } from './secret'

/**
 * Etiquetas de caché que el backend puede pedir regenerar: `products`, `categories`, `settings`,
 * `combos`, `product:{slug}`, `reviews:{slug}` y `content:{página}`, de hasta 100 caracteres (un
 * slug tiene hasta 80): una etiqueta más larga no llega al estado de etiquetas de Next.
 */
export const REVALIDATE_TAG_PATTERN =
  /^(?=.{1,100}$)(products|categories|settings|combos|product:[a-z0-9-]+|reviews:[a-z0-9-]+|content:[a-z-]+)$/

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
  return secretMatches(provided, expected)
}

/**
 * Perfil con el que se regenera una etiqueta: el contenido editable (`content:*`) pasa a
 * `'max'` (se sirve lo anterior mientras se regenera); precios, stock, productos, líneas, combos
 * y ajustes vencen al instante, así el próximo visitante ya ve el dato nuevo.
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

/**
 * Regenera las etiquetas que cumplen {@link REVALIDATE_TAG_PATTERN}, cada una con su perfil
 * ({@link revalidationProfileFor}); las demás se ignoran sin tirar, porque una etiqueta rara no
 * tiene que romper la escritura que la pidió.
 *
 * @param tags - Las etiquetas pedidas.
 * @param revalidate - Quien regenera una etiqueta; en la tienda, `revalidateTag` de Next.
 */
export function revalidateValidTags(
  tags: readonly string[],
  revalidate: (tag: string, profile: 'max' | { expire: 0 }) => void,
): void {
  for (const tag of tags) {
    if (REVALIDATE_TAG_PATTERN.test(tag)) revalidate(tag, revalidationProfileFor(tag))
  }
}
