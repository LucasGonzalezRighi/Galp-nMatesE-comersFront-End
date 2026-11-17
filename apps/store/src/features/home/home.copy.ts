import { pluralize } from '@galpon/domain'

/** Microtextos del inicio, tal como están en el diseño. Los títulos y párrafos salen del contenido de la API. */
export const HOME_COPY = {
  /** Píldora de la portada: la marca, antes del texto corto del contenido. */
  brand: 'Galpón Mates',
  /** Colección: link de cada tarjeta y de la tarjeta final. */
  viewLine: 'Ver línea',
  viewCatalog: 'Ver todo el catálogo',
  /** Colección: el carrusel con flechas (Ruling IC-9). */
  collectionCarousel: {
    /** Nombre accesible de la región. */
    label: 'Líneas de producto',
    /** Qué es cada tarjeta para el lector de pantalla. */
    item: 'línea',
    /** Flechas. */
    previous: 'Línea anterior',
    next: 'Línea siguiente',
  },
  /** Combos (Ruling IC-12): título y bajada fijos (no son contenido editable) y el carrusel. */
  combos: {
    title: 'Combos listos para cebar',
    text: 'Mate y bombilla, o mate y yerba, elegidos para ir juntos y a precio cerrado. Si el combo trae mate, el cuero lo elegís vos.',
    carousel: {
      /** Nombre accesible de la región. */
      label: 'Combos',
      /** Qué es cada tarjeta para el lector de pantalla. */
      item: 'combo',
      /** Flechas. */
      previous: 'Combo anterior',
      next: 'Combo siguiente',
    },
  },
  /** Destacados: link a la tienda. */
  viewShop: 'Ver toda la tienda',
  /** Cifras: rótulos de las cuatro cifras. */
  statPieces: 'Piezas en catálogo',
  statLines: 'Líneas de producto',
  statProvinces: 'Jurisdicciones con envío: todo el país',
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
  /** El mate 3D (el inicio en escritorio): nombre accesible de la sección fija. */
  stageLabel: 'El mate',
  /** El mate 3D: nombre accesible del raíl de paradas. */
  railLabel: 'Paradas del mate',
  /** El mate 3D: pista que invita a hacer scroll y desaparece al empezar. */
  scrollHint: 'Deslizá para recorrer',
  /** El mate 3D: nombre de cada parada (la portada, la bombilla y el agua), para el raíl y su encabezado. */
  stopNames: {
    hero: 'El mate',
    bombilla: 'La bombilla',
    ritual: 'El agua',
  },
  /** La portada del v4 donde no hay mate 3D (Ruling IC-8): la pila de piezas con flechas. */
  heroCarousel: {
    /** Palabra gigante de contorno detrás de la pila, según el grupo de la pieza actual. */
    words: { mate: 'Mates', bombilla: 'Bombillas', yerba: 'Yerba' },
    /** Botón que suma la pieza actual al carrito. */
    add: 'Agregar',
    /** Link a la ficha de la pieza actual. */
    view: 'Ver pieza',
    /** Flechas. */
    previous: 'Pieza anterior',
    next: 'Pieza siguiente',
    /** Nombre accesible de los puntos (uno por pieza, con su nombre). */
    dots: 'Elegir pieza',
    /** Nombre accesible de la pila de tarjetas. */
    stack: 'Piezas de la portada',
  },
  /** Reseñas: nombre accesible de la lista de notas. */
  reviewsList: 'Reseñas de clientes',
  /** Reseñas: marca de las reseñas de alguien que compró el producto. */
  verifiedPurchase: 'Compra verificada',
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

/**
 * Contador de una parada del mate 3D, para su encabezado.
 *
 * @param position - Posición de la parada, un entero de 1 a `total`.
 * @param total - Cantidad de paradas, un entero mayor o igual a 1.
 * @returns Por ejemplo `02 / 03`.
 * @throws {RangeError} Si `position` no es un entero de 1 a `total` o `total` no es un entero mayor o igual a 1.
 */
export function stopCounter(position: number, total: number): string {
  if (
    !Number.isInteger(total) ||
    total < 1 ||
    !Number.isInteger(position) ||
    position < 1 ||
    position > total
  ) {
    throw new RangeError(
      `La parada tiene que ser un entero de 1 a la cantidad de paradas; se recibió ${String(position)} de ${String(total)}.`,
    )
  }
  return `${orderLabel(position)} / ${orderLabel(total)}`
}

/**
 * Encabezado de una parada del mate 3D: su contador y su nombre.
 *
 * @param position - Posición de la parada, un entero de 1 a `total`.
 * @param total - Cantidad de paradas, un entero mayor o igual a 1.
 * @param name - Nombre de la parada.
 * @returns Por ejemplo `02 / 03 · La bombilla`.
 * @throws {RangeError} Si `position` o `total` no son válidos (ver {@link stopCounter}).
 */
export function stopHeading(position: number, total: number, name: string): string {
  return `${stopCounter(position, total)} · ${name}`
}

/**
 * Nombre accesible del link "Ver pieza" de la portada del v4.
 *
 * @param name - Nombre de la pieza.
 * @returns Por ejemplo `Ver pieza: Mate Imperial Premium`.
 */
export function heroViewLabel(name: string): string {
  return `${HOME_COPY.heroCarousel.view}: ${name}`
}

/**
 * Lo que se anuncia al cambiar de pieza en la portada del v4 (solo cambia con las flechas, los
 * puntos o el dedo: no hay avance solo).
 *
 * @param name - Nombre de la pieza actual.
 * @param position - Posición de la pieza, un entero de 1 a `total`.
 * @param total - Cantidad de piezas, un entero mayor o igual a 1.
 * @returns Por ejemplo `Bombillón Premium Curvo, pieza 2 de 5`.
 * @throws {RangeError} Si `position` no es un entero de 1 a `total` o `total` no es un entero mayor o igual a 1.
 */
export function heroSlideAnnouncement(name: string, position: number, total: number): string {
  if (
    !Number.isInteger(total) ||
    total < 1 ||
    !Number.isInteger(position) ||
    position < 1 ||
    position > total
  ) {
    throw new RangeError(
      `La pieza tiene que ser un entero de 1 a la cantidad de piezas; se recibió ${String(position)} de ${String(total)}.`,
    )
  }
  return `${name}, pieza ${String(position)} de ${String(total)}`
}
