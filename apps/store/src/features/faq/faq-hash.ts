/** Lo mínimo que se necesita de una categoría para encontrarla por su ancla. */
interface CategoryRef {
  /** Identificador de la categoría, que es el ancla de la dirección (`#envios`). */
  id: string
}

/**
 * Busca la categoría a la que apunta el ancla de una dirección.
 *
 * @param hash - El ancla, con o sin `#` (`#envios`); puede venir codificada.
 * @param categories - Las categorías de la página.
 * @returns El `id` de la categoría, o `null` si el ancla está vacía, está mal codificada o no es
 *   de ninguna categoría.
 * @example
 * faqCategoryFromHash('#envios', categories) // "envios"
 */
export function faqCategoryFromHash(
  hash: string,
  categories: readonly CategoryRef[],
): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  let id: string
  try {
    id = decodeURIComponent(raw)
  } catch {
    // Un ancla mal codificada ("%") no es de ninguna categoría.
    return null
  }
  return categories.some((category) => category.id === id) ? id : null
}
