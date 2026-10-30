/*
 * Geometría del logo de la intro: el matecito arriba y GALPÓN abajo, en un solo `viewBox` con
 * las coordenadas de la palabra (`galpon-wordmark`, 4341 x 837). El matecito (`galpon-mark`,
 * 844 x 1116) va centrado sobre el corte del libro, que cae en el hueco entre la L (termina en
 * x = 2251) y la P (empieza en x = 2368,5).
 */

/** Ancho y alto de una imagen del logo, en sus propias coordenadas. */
export interface LogoBox {
  /** Ancho. */
  width: number
  /** Alto. */
  height: number
}

/** La palabra GALPÓN (`public/brand/galpon-wordmark.svg`). */
export const WORD_BOX: LogoBox = { width: 4341, height: 837 }

/** El matecito (`public/brand/galpon-mark.svg`). */
export const MARK_BOX: LogoBox = { width: 844, height: 1116 }

/**
 * Las imágenes del logo que usa el telón como máscara (el logo ya hecho, sin los trazos). El
 * proveedor las precarga cuando la página queda libre, así el primer telón no baja sin logo.
 */
export const CURTAIN_LOGO_IMAGES = {
  /** El matecito. */
  mark: '/brand/galpon-mark.svg',
  /** La palabra GALPÓN. */
  word: '/brand/galpon-wordmark.svg',
} as const

/** Escala del matecito respecto de la palabra: su alto es 1,47 veces el de las letras. */
export const MARK_SCALE = 1.1

/** Aire entre el matecito y la palabra, en coordenadas de la palabra. */
const LOGO_GAP = 240

/** Margen alrededor del logo para que el trazo no se corte en los bordes. */
const LOGO_PAD = 24

/** Dónde se parte el logo en dos (el medio del hueco entre la L y la P), en x de la palabra. */
export const CUT_X = 2309.7

/** Esquina izquierda del matecito, centrado sobre el corte. */
export const MARK_X = CUT_X - (MARK_BOX.width * MARK_SCALE) / 2

/** Borde de arriba de la palabra. */
export const WORD_Y = MARK_BOX.height * MARK_SCALE + LOGO_GAP

/** `viewBox` del logo entero, con el margen. */
export const LOGO_VIEWBOX = {
  x: -LOGO_PAD,
  y: -LOGO_PAD,
  width: WORD_BOX.width + LOGO_PAD * 2,
  height: WORD_Y + WORD_BOX.height + LOGO_PAD * 2,
} as const

/**
 * Cuánto se corre el logo, en porcentaje de su propio ancho, para que el corte quede en el medio
 * de la pantalla (negativo: a la izquierda, porque el corte está a la derecha del centro).
 */
export const CUT_SHIFT_PERCENT = 50 - ((CUT_X - LOGO_VIEWBOX.x) / LOGO_VIEWBOX.width) * 100

/** Grosor del trazo en pantalla, en píxeles. */
export const STROKE_PX = 2

/**
 * Grosor del trazo en coordenadas del logo para que en pantalla mida {@link STROKE_PX}.
 *
 * @param renderedWidth - Ancho con que se ve el logo, en píxeles.
 * @returns El grosor en coordenadas del `viewBox`; con un ancho de 0 (sin diseño, en jsdom), el de
 *   un logo de 620 px.
 * @throws {RangeError} Si el ancho es negativo o no es un número finito.
 */
export function strokeWidthFor(renderedWidth: number): number {
  if (!Number.isFinite(renderedWidth) || renderedWidth < 0) {
    throw new RangeError(
      `El ancho del logo tiene que ser un número finito no negativo; se recibió ${String(renderedWidth)}.`,
    )
  }
  const width = renderedWidth === 0 ? 620 : renderedWidth
  return (STROKE_PX * LOGO_VIEWBOX.width) / width
}
