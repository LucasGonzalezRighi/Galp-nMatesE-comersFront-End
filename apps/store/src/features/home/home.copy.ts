import { pluralize } from '@galpon/domain'

/** Microtextos del inicio, tal como están en el diseño. Los títulos y párrafos salen del contenido de la API. */
export const HOME_COPY = {
  /** Píldora de la portada: la marca, antes del texto corto del contenido. */
  brand: 'Galpón Mates',
  /** Palabra gigante de fondo de la escena del bombillón. */
  ghostWord: 'Bombilla',
  /** Escena de la calabaza: rótulos de las tres cifras. */
  modelsOfMate: 'modelos de mate',
  mateLines: 'líneas',
  leathersToChoose: 'cueros a elección',
  /** Escena del cuero: botón hacia todos los mates. */
  allMates: 'Ver todos los mates',
  /** Colección: link de cada tarjeta y de la tarjeta final. */
  viewLine: 'Ver línea',
  viewCatalog: 'Ver todo el catálogo',
  /** Destacados: link a la tienda. */
  viewShop: 'Ver toda la tienda',
  /** Cifras: rótulos de las cuatro cifras. */
  statPieces: 'Piezas en catálogo',
  statLines: 'Líneas de producto',
  statProvinces: 'Provincias con envío',
  statPartners: 'Socios detrás de cada pedido',
  /** Bloque del kit: las tres piezas y el resumen. */
  kitMate: 'Mate',
  kitBombilla: 'Bombilla',
  kitYerba: 'Yerba',
  kitComplete: '= Kit ronda completa',
  /** Bloque del kit: lo que sigue al descuento en el título ("−10% en el kit."). */
  kitInKit: 'en el kit.',
  /** Pista del botón de agregar de una escena cuando ya está en el carrito todo lo disponible. */
  cartLimit: 'Ya tenés el máximo disponible en el carrito',
  /** Nombre accesible de la lista de productos de una escena. */
  storyProducts: 'Productos de la escena',
} as const

/**
 * Nombre accesible del botón de agregar un producto de una escena.
 *
 * @param name - Nombre del producto.
 * @returns Por ejemplo `Agregar Mate Imperial Premium al carrito`.
 */
export function addProductLabel(name: string): string {
  return `Agregar ${name} al carrito`
}

/**
 * Cierre del título del bloque del kit, con el descuento delante.
 *
 * @param discountLabel - El descuento ya formateado, por ejemplo `−10%`.
 * @returns Por ejemplo `−10% en el kit.`
 */
export function kitDiscountTitle(discountLabel: string): string {
  return `${discountLabel} ${HOME_COPY.kitInKit}`
}

/**
 * Texto de una reseña entre comillas tipográficas.
 *
 * @param text - Texto de la reseña.
 * @returns Por ejemplo `“Muy buen mate.”`
 */
export function quoteLabel(text: string): string {
  return `“${text}”`
}

/**
 * Texto del marco de la tarjeta de una línea cuando todavía no tiene foto, como en el diseño.
 *
 * @param name - Nombre de la línea.
 * @returns Por ejemplo `Foto · Bombillones`.
 */
export function linePhotoPlaceholder(name: string): string {
  return `Foto · ${name}`
}

/**
 * Cantidad de piezas de una línea o del catálogo.
 *
 * @param count - Un entero mayor o igual a 0.
 * @returns Por ejemplo `1 pieza` o `4 piezas`.
 * @throws {RangeError} Si no es un entero mayor o igual a 0.
 */
export function piecesLabel(count: number): string {
  return pluralize(count, 'pieza', 'piezas')
}

/**
 * Cantidad de opciones de un paso del kit.
 *
 * @param count - Un entero mayor o igual a 0.
 * @returns Por ejemplo `1 opción` o `16 opciones`.
 * @throws {RangeError} Si no es un entero mayor o igual a 0.
 */
export function optionsLabel(count: number): string {
  return pluralize(count, 'opción', 'opciones')
}

/**
 * Número de orden de dos cifras, para las líneas de la colección y los pasos del ritual.
 *
 * @param position - Posición, un entero mayor o igual a 1.
 * @returns Por ejemplo `01` o `12`.
 * @throws {RangeError} Si no es un entero mayor o igual a 1.
 */
export function orderLabel(position: number): string {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError(
      `La posición tiene que ser un entero mayor o igual a 1; se recibió ${String(position)}.`,
    )
  }
  return String(position).padStart(2, '0')
}
