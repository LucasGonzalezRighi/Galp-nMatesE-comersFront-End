/**
 * Dirección de la ficha de un producto en la tienda.
 *
 * @param storeUrl - URL de la tienda, sin barra final (la del contexto del router).
 * @param slug - Slug actual del producto.
 * @returns `{storeUrl}/producto/{slug}`.
 * @throws {RangeError} Si `storeUrl` o `slug` están vacíos.
 * @example
 * storeProductUrl('http://localhost:3000', 'mate-imperial-premium')
 * // "http://localhost:3000/producto/mate-imperial-premium"
 */
export function storeProductUrl(storeUrl: string, slug: string): string {
  if (storeUrl.trim() === '') {
    throw new RangeError('La URL de la tienda no puede estar vacía.')
  }
  if (slug.trim() === '') {
    throw new RangeError('El slug del producto no puede estar vacío.')
  }
  return `${storeUrl}/producto/${encodeURIComponent(slug)}`
}

/**
 * Separa un texto que escribió un cliente en párrafos: uno por renglón, sin los espacios de los
 * bordes ni los renglones vacíos.
 *
 * @param text - Texto de la reseña.
 * @returns Los párrafos, en orden (vacío si no hay texto).
 * @example
 * toParagraphs('Hermoso.\n\nLlegó rápido.') // ["Hermoso.", "Llegó rápido."]
 */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
}
