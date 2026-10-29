/** Microtextos de la ficha de producto, tal como están en el diseño y en el spec (9.5 y 14.6). */
export const PRODUCT_COPY = {
  /** Primer escalón de las migas. */
  breadcrumbShop: 'Tienda',
  /** Nombre accesible de las migas. */
  breadcrumbLabel: 'Ruta de navegación',
  /** Texto del promedio cuando todavía no hay reseñas. */
  noReviews: 'Todavía no hay reseñas',
  /** Nombre accesible del enlace que lleva a las reseñas. */
  goToReviews: 'Ver las reseñas',
  /** Stock disponible, junto al punto que late. */
  inStock: 'En stock · listo para despachar',
  /** Sin stock. */
  outOfStock: 'Sin stock por ahora',
  /** Título de la elección del cuero. */
  leather: 'Cuero',
  /** Título de la elección de la virola. */
  ferrule: 'Virola',
  /** Botón de agregar al carrito. */
  addToCart: 'Agregar al carrito',
  /** Botón de comprar ya. */
  buyNow: 'Comprar ahora',
  /** Botón de un producto que no se puede comprar (sin precio o sin stock). */
  consultByMail: 'Consultar por mail',
  /** Pista del botón de agregar cuando ya está en el carrito todo lo que se puede comprar. */
  cartLimit: 'Ya tenés el máximo disponible en el carrito',
  /** Prefijo del asunto del mail de consulta; lleva el nombre del producto detrás. */
  consultSubject: 'Consulta:',
  /** Nombre accesible del bloque de garantías. */
  guaranteesLabel: 'Garantías de compra',
  /** Garantías: título y detalle de cada una (Cambios y Arrepentimiento van por separado, spec 14.6). */
  guarantees: {
    shipping: { title: 'Envío a todo el país', detail: 'Calculalo en el checkout' },
    payment: { title: 'Pago seguro', detail: 'Con Mercado Pago' },
    exchange: { title: 'Cambios', detail: '10 días, sin uso' },
    withdrawal: { title: 'Arrepentimiento', detail: '10 días corridos, sin causa y sin costo' },
  },
  /** Nombre accesible de las pestañas. */
  tabsLabel: 'Información del producto',
  /** Pestaña de la descripción. */
  tabDescription: 'Descripción',
  /** Pestaña de envío y cambios. */
  tabShipping: 'Envío y cambios',
  /** Nombre accesible de la foto anterior. */
  previousPhoto: 'Foto anterior',
  /** Nombre accesible de la foto siguiente. */
  nextPhoto: 'Foto siguiente',
  /** Prefijo del nombre accesible de cada miniatura; lleva el número de foto detrás (ver `photoButtonLabel`). */
  showPhoto: 'Ver la foto',
  /** Texto pequeño de la banda del kit. */
  kitEyebrow: 'Completá la ronda',
  /** Botón de la banda del kit. */
  kitButton: 'Armar kit con este mate',
  /** Texto pequeño de los relacionados. */
  relatedEyebrow: 'También te puede gustar',
  /** Título de los relacionados. */
  relatedTitle: 'Más para la ronda',
} as const

/**
 * Texto del marco de la galería cuando el producto no tiene fotos, como en el diseño.
 *
 * @param position - Número de la foto, un entero mayor o igual a 1.
 * @param productName - Nombre del producto.
 * @returns Por ejemplo `Foto 1 · Mate Galleta`.
 * @throws {RangeError} Si `position` no es un entero mayor o igual a 1.
 */
export function photoPlaceholder(position: number, productName: string): string {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError(
      `El número de foto tiene que ser un entero mayor o igual a 1; se recibió ${String(position)}.`,
    )
  }
  return `Foto ${String(position)} · ${productName}`
}

/**
 * Nombre accesible de la miniatura de una foto de la galería. Lleva el número con dos cifras, el
 * mismo que se ve en el botón, para que el nombre contenga el texto visible (WCAG 2.5.3).
 *
 * @param position - Número de la foto, un entero mayor o igual a 1.
 * @returns Por ejemplo `Ver la foto 01`.
 * @throws {RangeError} Si `position` no es un entero mayor o igual a 1.
 */
export function photoButtonLabel(position: number): string {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError(
      `El número de foto tiene que ser un entero mayor o igual a 1; se recibió ${String(position)}.`,
    )
  }
  return `${PRODUCT_COPY.showPhoto} ${String(position).padStart(2, '0')}`
}

/** Título de la banda del kit: con descuento, lo nombra; sin descuento, solo invita a sumar las piezas. */
export function kitBandTitle(discount: string | null): string {
  return discount === null
    ? 'Sumale bombilla y yerba a este mate.'
    : `Sumale bombilla y yerba a este mate y llevate ${discount}.`
}
