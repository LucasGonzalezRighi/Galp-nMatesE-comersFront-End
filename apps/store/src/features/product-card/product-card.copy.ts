/** Microtextos de la tarjeta de producto, tal como están en el diseño (`ProductCard.dc.html`). */
export const PRODUCT_CARD_COPY = {
  /** Píldora que aparece al pasar el mouse. */
  viewDetail: 'Ver detalle',
  /** Etiqueta de un producto sin stock. */
  soldOut: 'Sin stock',
  /** Etiqueta (y precio) de un producto "a consultar". */
  consult: 'Consultar',
  /** Leyenda bajo el precio de un producto "a consultar". */
  priceToConfirm: 'Precio a confirmar',
  /** Texto solo para lectores de pantalla antes del promedio de reseñas. */
  rating: 'Puntuación',
  /** Pista del botón de agregar cuando ya está en el carrito todo lo que se puede comprar. */
  cartLimit: 'Ya tenés el máximo disponible en el carrito',
  /**
   * Botón centrado debajo de las hileras de una grilla de tarjetas que despliega el resto (la
   * tienda, los relacionados de la ficha y los destacados del inicio en el celular, Ruling AT-2).
   */
  moreProducts: 'Ver más productos',
} as const

/**
 * Nombre accesible del botón de agregar rápido de la tarjeta, con el nombre del producto (como el
 * del hero): en una grilla, cada "+" se distingue de los demás.
 *
 * @param name - Nombre del producto, no vacío.
 * @returns "Agregar {nombre} al carrito".
 * @throws {RangeError} Si `name` está vacío o solo tiene espacios.
 * @example
 * addToCartLabel('Mate Imperial Premium') // 'Agregar Mate Imperial Premium al carrito'
 */
export function addToCartLabel(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '') throw new RangeError('El nombre del producto no puede estar vacío')
  return `Agregar ${trimmed} al carrito`
}
